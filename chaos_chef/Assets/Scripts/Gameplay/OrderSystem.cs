using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using ChaosChef.Data;

namespace ChaosChef.Gameplay
{
    /// <summary>
    /// Quản lý toàn bộ đơn hàng trong level.
    ///
    /// Cách hoạt động (giống như bồi bàn nhà hàng):
    ///   1. Spawn đơn hàng theo thời gian
    ///   2. Nhân vật tương tác với station → AdvanceStep()
    ///   3. Nếu đúng thứ tự → bước tiếp
    ///   4. Nếu sai thứ tự → đơn bị hỏng (fail)
    ///   5. Hết thời gian → fail
    /// </summary>
    public class OrderSystem : MonoBehaviour
    {
        public static OrderSystem Instance { get; private set; }

        [Header("Config")]
        [SerializeField] private List<Order> availableOrders = new(); // Kéo prefab vào đây
        [SerializeField] private int maxActiveOrders = 3;
        [SerializeField] private float spawnInterval = 15f;           // Giây giữa các đơn hàng

        // ── Runtime ──────────────────────────────────────────────────────
        public List<Order> ActiveOrders { get; } = new();

        public event Action<Order> OnOrderAdded;
        public event Action<Order, bool> OnOrderCompleted; // bool = thành công hay fail
        public event Action<Order> OnOrderUpdated;         // cập nhật bước hiện tại

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Start()
        {
            StartCoroutine(SpawnOrdersRoutine());
        }

        void Update()
        {
            // Đếm ngược timer của từng đơn hàng đang active
            for (int i = ActiveOrders.Count - 1; i >= 0; i--)
            {
                var order = ActiveOrders[i];
                if (order.status != OrderStatus.InProgress) continue;

                order.remainingTime -= Time.deltaTime;
                order.elapsedTime   += Time.deltaTime;

                if (order.remainingTime <= 0f)
                {
                    FailOrder(order);
                }
            }
        }

        IEnumerator SpawnOrdersRoutine()
        {
            yield return new WaitForSeconds(3f); // Delay lúc đầu level

            while (true)
            {
                if (ActiveOrders.Count < maxActiveOrders && availableOrders.Count > 0)
                {
                    SpawnRandomOrder();
                }
                yield return new WaitForSeconds(spawnInterval);
            }
        }

        void SpawnRandomOrder()
        {
            var template = availableOrders[UnityEngine.Random.Range(0, availableOrders.Count)];

            // Clone để không modify asset gốc
            var order = new Order
            {
                orderName      = template.orderName,
                dishIcon       = template.dishIcon,
                steps          = new List<OrderStep>(template.steps),
                baseReward     = template.baseReward,
                bonusTimeSeconds = template.bonusTimeSeconds,
                timeLimit      = template.timeLimit,
            };
            order.Reset();
            order.status = OrderStatus.InProgress;

            ActiveOrders.Add(order);
            OnOrderAdded?.Invoke(order);

            Debug.Log($"[OrderSystem] Đơn mới: {order.orderName} ({order.steps.Count} bước, {order.timeLimit}s)");
        }

        /// <summary>
        /// Gọi khi nhân vật tương tác với một station.
        /// Kiểm tra đúng thứ tự không → advance hoặc fail.
        ///
        /// Ví dụ: nhân vật đứng ở CookingPot bấm interact
        ///   → tìm đơn hàng nào đang chờ bước "CookingPot"
        ///   → nếu đúng thứ tự → tiến bước
        ///   → nếu sai thứ tự → fail đơn đó
        /// </summary>
        public bool TryAdvanceStep(StationType station, ChaosChef.Data.CharacterRole characterRole)
        {
            foreach (var order in ActiveOrders)
            {
                if (order.status != OrderStatus.InProgress) continue;
                var currentStep = order.CurrentStep;
                if (currentStep == null) continue;

                if (currentStep.requiredStation != station) continue;

                // Kiểm tra nhân vật có được làm bước này không
                if (currentStep.allowedRoles != null && currentStep.allowedRoles.Length > 0)
                {
                    bool allowed = System.Array.Exists(currentStep.allowedRoles, r => r == characterRole);
                    if (!allowed)
                    {
                        Debug.LogWarning($"[OrderSystem] {characterRole} không được phép làm bước '{currentStep.stepName}'!");
                        return false;
                    }
                }

                // Đúng rồi → advance
                order.currentStepIndex++;
                OnOrderUpdated?.Invoke(order);

                if (order.IsCompleted)
                {
                    CompleteOrder(order);
                }

                return true;
            }

            return false; // Không tìm được đơn hàng phù hợp
        }

        void CompleteOrder(Order order)
        {
            order.status = OrderStatus.Completed;
            int coins = order.CalculateReward();
            ScoreManager.Instance.AddCoins(coins);
            ScoreManager.Instance.RegisterOrderResult(true);
            ActiveOrders.Remove(order);
            OnOrderCompleted?.Invoke(order, true);
            Debug.Log($"[OrderSystem] ✅ '{order.orderName}' hoàn thành! +{coins} xu");
        }

        void FailOrder(Order order)
        {
            order.status = OrderStatus.Failed;
            ScoreManager.Instance.AddCoins(order.CalculateReward()); // -500 penalty
            ScoreManager.Instance.RegisterOrderResult(false);
            ActiveOrders.Remove(order);
            OnOrderCompleted?.Invoke(order, false);
            Debug.Log($"[OrderSystem] ❌ '{order.orderName}' bị hỏng! -500 xu");
        }

        /// <summary>Gọi từ EventManager khi event "Rửa Bát Vỡ" xảy ra.</summary>
        public void AddExtraWashStep()
        {
            foreach (var order in ActiveOrders)
            {
                if (order.status != OrderStatus.InProgress) continue;
                var extraStep = new OrderStep
                {
                    stepName         = "Rửa bát (khẩn cấp)",
                    duration         = 5f,
                    requiredStation  = StationType.Sink
                };
                // Chèn vào đầu chuỗi còn lại
                order.steps.Insert(order.currentStepIndex, extraStep);
                OnOrderUpdated?.Invoke(order);
            }
        }
    }
}
