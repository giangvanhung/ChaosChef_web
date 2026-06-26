using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using ChaosChef.Data;
using ChaosChef.Gameplay;

namespace ChaosChef.UI
{
    /// <summary>
    /// Hiển thị danh sách đơn hàng đang active trên màn hình.
    ///
    /// Cần trong Inspector:
    ///   - orderCardPrefab: 1 card UI cho 1 đơn hàng (có Image, TMP texts, timer bar)
    ///   - orderContainer: RectTransform chứa các card (dùng Vertical Layout Group)
    /// </summary>
    public class OrderDisplay : MonoBehaviour
    {
        [SerializeField] private GameObject orderCardPrefab;
        [SerializeField] private Transform orderContainer;

        private Dictionary<Order, GameObject> _orderCards = new();

        void OnEnable()
        {
            OrderSystem.Instance.OnOrderAdded     += AddOrderCard;
            OrderSystem.Instance.OnOrderCompleted += RemoveOrderCard;
            OrderSystem.Instance.OnOrderUpdated   += UpdateOrderCard;
        }

        void OnDisable()
        {
            if (OrderSystem.Instance == null) return;
            OrderSystem.Instance.OnOrderAdded     -= AddOrderCard;
            OrderSystem.Instance.OnOrderCompleted -= RemoveOrderCard;
            OrderSystem.Instance.OnOrderUpdated   -= UpdateOrderCard;
        }

        void Update()
        {
            // Cập nhật timer bar mỗi frame
            foreach (var (order, card) in _orderCards)
            {
                if (card == null) continue;
                float ratio = order.remainingTime / order.timeLimit;
                var timerBar = card.transform.Find("TimerBar")?.GetComponent<Image>();
                if (timerBar != null)
                {
                    timerBar.fillAmount = Mathf.Clamp01(ratio);
                    timerBar.color = ratio > 0.5f ? Color.green : ratio > 0.25f ? Color.yellow : Color.red;
                }
            }
        }

        void AddOrderCard(Order order)
        {
            if (orderCardPrefab == null || orderContainer == null) return;

            var card = Instantiate(orderCardPrefab, orderContainer);
            _orderCards[order] = card;
            RefreshCard(order, card);
        }

        void RemoveOrderCard(Order order, bool success)
        {
            if (!_orderCards.TryGetValue(order, out var card)) return;
            // TODO: play success/fail animation trước khi destroy
            Destroy(card);
            _orderCards.Remove(order);
        }

        void UpdateOrderCard(Order order)
        {
            if (!_orderCards.TryGetValue(order, out var card)) return;
            RefreshCard(order, card);
        }

        void RefreshCard(Order order, GameObject card)
        {
            // Tên đơn hàng
            var nameText = card.transform.Find("OrderName")?.GetComponent<TextMeshProUGUI>();
            if (nameText != null) nameText.text = order.orderName;

            // Icon món ăn
            var icon = card.transform.Find("DishIcon")?.GetComponent<Image>();
            if (icon != null && order.dishIcon != null) icon.sprite = order.dishIcon;

            // Bước hiện tại
            var stepText = card.transform.Find("CurrentStep")?.GetComponent<TextMeshProUGUI>();
            if (stepText != null)
            {
                var step = order.CurrentStep;
                stepText.text = step != null ? $"→ {step.stepName}" : "✅ Phục vụ!";
            }

            // Reward
            var rewardText = card.transform.Find("Reward")?.GetComponent<TextMeshProUGUI>();
            if (rewardText != null) rewardText.text = $"💰 {order.baseReward} xu";
        }
    }
}
