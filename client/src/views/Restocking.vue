<template>
  <div>
    <div class="page-header">
      <h2>Restocking Planner</h2>
      <p>Set your budget to get recommendations ranked by demand gap</p>
    </div>

    <!-- Success banner (shown after order is placed) -->
    <div v-if="orderPlaced && placedOrder" class="success-banner">
      <div class="success-icon">&#10003;</div>
      <div class="success-content">
        <strong>Order {{ placedOrder.order_number }} submitted</strong>
        <p>Status: <span class="badge info">Processing</span> &nbsp; Expected delivery: {{ formatDate(placedOrder.expected_delivery) }}</p>
      </div>
    </div>

    <!-- Loading/Error states -->
    <div v-if="loading" class="loading">Loading restocking data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <!-- Budget slider card -->
      <div class="card budget-card">
        <div class="card-header">
          <h3 class="card-title">Available Budget</h3>
          <span class="budget-display">{{ formatCurrency(budget) }}</span>
        </div>
        <div class="slider-wrapper">
          <span class="slider-min">$1,000</span>
          <input
            type="range"
            v-model.number="budget"
            min="1000"
            max="500000"
            step="1000"
            class="budget-slider"
          />
          <span class="slider-max">$500,000</span>
        </div>
        <div class="budget-breakdown">
          <span>Allocated: <strong>{{ formatCurrency(totalOrderCost) }}</strong></span>
          <span>Remaining: <strong :class="remainingBudget < 0 ? 'text-danger' : 'text-success'">{{ formatCurrency(remainingBudget) }}</strong></span>
        </div>
      </div>

      <!-- Summary stat cards -->
      <div class="stats-grid">
        <div class="stat-card info">
          <div class="stat-label">Items Selected</div>
          <div class="stat-value">{{ recommendations.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Cost</div>
          <div class="stat-value">{{ formatCurrency(totalOrderCost) }}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Items Over Budget</div>
          <div class="stat-value">{{ uncoveredItems }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Remaining Budget</div>
          <div class="stat-value">{{ formatCurrency(remainingBudget) }}</div>
        </div>
      </div>

      <!-- Recommendations table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recommended Restocking Items</h3>
          <span class="muted-text">Sorted by demand gap (largest first)</span>
        </div>

        <div v-if="recommendations.length === 0" class="empty-state">
          No items can be restocked with the current budget. Try increasing the budget.
        </div>

        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item Name</th>
                <th>Current Stock</th>
                <th>Forecasted Demand</th>
                <th>Gap</th>
                <th>Unit Cost</th>
                <th>Qty to Order</th>
                <th>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              <!-- Use item.sku as key — unique per inventory item, never index -->
              <tr v-for="item in recommendations" :key="item.sku">
                <td><code class="sku-code">{{ item.sku }}</code></td>
                <td>{{ item.name }}</td>
                <td>{{ item.currentStock.toLocaleString() }}</td>
                <td>{{ item.forecastedDemand.toLocaleString() }}</td>
                <td><strong class="gap-value">+{{ item.demandGap.toLocaleString() }}</strong></td>
                <td>{{ formatCurrency(item.unitCost) }}</td>
                <td>{{ item.orderQuantity.toLocaleString() }}</td>
                <td><strong>{{ formatCurrency(item.orderCost) }}</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="7"><strong>Total</strong></td>
                <td><strong>{{ formatCurrency(totalOrderCost) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Place Order button -->
        <div class="order-actions">
          <button
            class="place-order-btn"
            @click="placeOrder"
            :disabled="recommendations.length === 0 || placingOrder || orderPlaced"
          >
            <span v-if="placingOrder">Placing Order...</span>
            <span v-else-if="orderPlaced">Order Placed</span>
            <span v-else>Place Restocking Order ({{ formatCurrency(totalOrderCost) }})</span>
          </button>
        </div>
      </div>

      <!-- Uncovered items hint -->
      <div v-if="uncoveredItems > 0" class="card uncovered-hint">
        <p><strong>{{ uncoveredItems }}</strong> item{{ uncoveredItems > 1 ? 's' : '' }} couldn't be included within the current budget. Increase the budget to cover more items.</p>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'

export default {
  name: 'Restocking',
  setup() {
    // Raw data fetched from API
    const allForecasts = ref([])
    const allInventory = ref([])
    const loading = ref(true)
    const error = ref(null)
    const budget = ref(50000)
    const placingOrder = ref(false)
    const orderPlaced = ref(false)
    const placedOrder = ref(null)

    // Join forecasts with inventory by SKU, compute per-item demand gap.
    // Only include items where forecasted_demand exceeds current stock.
    // Sorted largest gap first so the greedy allocator prioritises the most urgent items.
    const itemsWithGap = computed(() => {
      return allForecasts.value
        .map(forecast => {
          const inv = allInventory.value.find(i => i.sku === forecast.item_sku)
          if (!inv) return null // Skip forecasts with no matching inventory record
          const demandGap = Math.max(0, forecast.forecasted_demand - inv.quantity_on_hand)
          return {
            sku: forecast.item_sku,
            name: forecast.item_name,
            trend: forecast.trend,
            currentStock: inv.quantity_on_hand,
            forecastedDemand: forecast.forecasted_demand,
            demandGap,
            unitCost: inv.unit_cost,
            warehouse: inv.warehouse,
            totalCost: demandGap * inv.unit_cost
          }
        })
        .filter(item => item !== null && item.demandGap > 0)
        .sort((a, b) => b.demandGap - a.demandGap) // Largest gap first
    })

    // Greedy budget allocation: iterate items ordered by demand gap descending.
    // For each item either fully fund it, partially fund it (unit-aligned), or skip.
    const recommendations = computed(() => {
      let remaining = budget.value
      const result = []
      for (const item of itemsWithGap.value) {
        if (remaining <= 0) break
        if (item.totalCost <= 0) continue
        if (remaining >= item.totalCost) {
          // Full order: enough budget to cover the entire gap
          result.push({ ...item, orderQuantity: item.demandGap, orderCost: item.totalCost })
          remaining -= item.totalCost
        } else if (remaining >= item.unitCost) {
          // Partial order: fill remaining budget at per-unit granularity
          const qty = Math.floor(remaining / item.unitCost)
          result.push({ ...item, orderQuantity: qty, orderCost: qty * item.unitCost })
          remaining = 0
        }
        // If remaining < unitCost, skip this item entirely
      }
      return result
    })

    const totalOrderCost = computed(() =>
      recommendations.value.reduce((sum, item) => sum + item.orderCost, 0)
    )

    const remainingBudget = computed(() => budget.value - totalOrderCost.value)

    // Items from itemsWithGap that weren't included in recommendations
    const uncoveredItems = computed(() =>
      itemsWithGap.value.length - recommendations.value.length
    )

    const loadData = async () => {
      try {
        loading.value = true
        error.value = null
        // Fetch demand forecasts and full inventory in parallel
        const [forecasts, inventory] = await Promise.all([
          api.getDemandForecasts(),
          api.getInventory({})
        ])
        allForecasts.value = forecasts
        allInventory.value = inventory
      } catch (err) {
        error.value = 'Failed to load restocking data'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const placeOrder = async () => {
      if (recommendations.value.length === 0) return
      placingOrder.value = true
      try {
        const orderData = {
          items: recommendations.value.map(item => ({
            sku: item.sku,
            name: item.name,
            quantity: item.orderQuantity,
            unit_cost: item.unitCost
          })),
          total_cost: totalOrderCost.value,
          warehouse: 'San Francisco'
        }
        placedOrder.value = await api.createRestockingOrder(orderData)
        orderPlaced.value = true
      } catch (err) {
        error.value = 'Failed to place order. Please try again.'
        console.error(err)
      } finally {
        placingOrder.value = false
      }
    }

    const formatCurrency = (value) => {
      return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    onMounted(loadData)

    return {
      allForecasts,
      allInventory,
      loading,
      error,
      budget,
      placingOrder,
      orderPlaced,
      placedOrder,
      itemsWithGap,
      recommendations,
      totalOrderCost,
      remainingBudget,
      uncoveredItems,
      placeOrder,
      formatCurrency,
      formatDate
    }
  }
}
</script>

<style scoped>
.budget-card .card-header {
  align-items: center;
}

.budget-display {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2563eb;
}

.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.budget-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
  outline: none;
  cursor: pointer;
}

.budget-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.4);
}

.slider-min,
.slider-max {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

.budget-breakdown {
  display: flex;
  gap: 2rem;
  font-size: 0.875rem;
  color: #64748b;
}

.text-success { color: #059669; }
.text-danger  { color: #dc2626; }

.muted-text {
  font-size: 0.8rem;
  color: #94a3b8;
}

.sku-code {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.8rem;
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  color: #475569;
}

.gap-value {
  color: #2563eb;
}

tfoot .total-row td {
  padding-top: 0.75rem;
  border-top: 2px solid #e2e8f0;
  font-size: 0.875rem;
}

.order-actions {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.place-order-btn {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.938rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
  font-family: inherit;
}

.place-order-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.place-order-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.success-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
}

.success-icon {
  width: 36px;
  height: 36px;
  background: #059669;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.success-content strong {
  display: block;
  color: #065f46;
  font-size: 0.938rem;
}

.success-content p {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #065f46;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}

.uncovered-hint {
  background: #fefce8;
  border-color: #fef08a;
  color: #854d0e;
  font-size: 0.875rem;
}
</style>
