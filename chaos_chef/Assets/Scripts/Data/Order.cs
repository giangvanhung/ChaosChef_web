using System.Collections.Generic;
using UnityEngine;

namespace ChaosChef.Data
{
    /// <summary>
    /// Một đơn hàng từ khách. Gồm nhiều bước phải làm đúng thứ tự.
    ///
    /// Ví dụ đơn "Mì tôm cà chua":
    ///   Step 0: Nấu mì (10s, CookingPot)
    ///   Step 1: Xếp cà chua (5s, PlateCounter)
    ///   Step 2: Hành lá (3s, PlateCounter)
    ///   → Tổng ~25s, reward 2000 xu + 10s bonus
    /// </summary>
    [System.Serializable]
    public class Order
    {
        [Header("Thông tin đơn hàng")]
        public string orderName;
        public Sprite dishIcon;          // Icon món ăn hiển thị trên UI
        public List<OrderStep> steps = new();

        [Header("Phần thưởng")]
        public int baseReward;           // Xu nhận nếu đúng giờ (100%)
        public float bonusTimeSeconds;   // Thêm bao nhiêu giây vào đồng hồ level
        public float timeLimit;          // Giới hạn thời gian đơn hàng (giây)

        // ── Runtime state (không serialize) ──────────────────────────────
        [System.NonSerialized] public int currentStepIndex = 0;
        [System.NonSerialized] public float remainingTime;
        [System.NonSerialized] public OrderStatus status = OrderStatus.Pending;
        [System.NonSerialized] public float elapsedTime = 0f; // để tính tiền penalty

        public bool IsCompleted => currentStepIndex >= steps.Count;
        public OrderStep CurrentStep => IsCompleted ? null : steps[currentStepIndex];

        /// <summary>
        /// Tính tiền nhận được dựa vào thời gian hoàn thành (có penalty).
        /// - Đúng giờ       → 100% baseReward
        /// - Quá 5 giây     → 75%
        /// - Quá 10 giây    → 50%
        /// - Fail/Timeout   → 0 - 500 xu penalty
        /// </summary>
        public int CalculateReward()
        {
            if (status == OrderStatus.Failed) return -500;

            float overtime = elapsedTime - timeLimit;
            if (overtime <= 0f)   return baseReward;
            if (overtime <= 5f)   return Mathf.RoundToInt(baseReward * 0.75f);
            if (overtime <= 10f)  return Mathf.RoundToInt(baseReward * 0.5f);
            return 0;
        }

        public void Reset()
        {
            currentStepIndex = 0;
            remainingTime = timeLimit;
            elapsedTime = 0f;
            status = OrderStatus.Pending;
        }
    }

    public enum OrderStatus
    {
        Pending,     // Chưa bắt đầu
        InProgress,  // Đang làm
        Completed,   // Hoàn thành (có thể đúng giờ hoặc trễ)
        Failed       // Bị hỏng hoặc timeout
    }
}
