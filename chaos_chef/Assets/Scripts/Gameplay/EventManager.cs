using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace ChaosChef.Gameplay
{
    /// <summary>
    /// Quản lý 5 sự cố bất ngờ theo GDD section 2.3.
    ///
    /// Mỗi 30–60 giây ngẫu nhiên trigger 1 trong các sự cố:
    ///   🔌 Cắt Điện   — màn hình tối 5 giây
    ///   🔥 Bếp Cháy   — 1 station bốc lửa, phải tắt
    ///   🏃 Khách Vội  — 1 đơn hàng tăng reward x2 nhưng deadline 15s
    ///   🍽 Rửa Bát Vỡ — thêm bước rửa bát vào đơn hàng
    ///   😤 Nhân Viên Bất Mãn — 1 nhân vật "ngồi suỵt" 15 giây
    /// </summary>
    public class EventManager : MonoBehaviour
    {
        public static EventManager Instance { get; private set; }

        [Header("Timing")]
        [SerializeField] private float minEventInterval = 30f;
        [SerializeField] private float maxEventInterval = 60f;

        [Header("References")]
        [SerializeField] private DishStation[] allStations;  // Kéo tất cả stations vào

        // Events để UI và các system khác lắng nghe
        public event Action<RandomEventType, string> OnEventTriggered;
        public event Action<RandomEventType> OnEventResolved;

        public bool IsBlackout { get; private set; }
        public RandomEventType ActiveEvent { get; private set; } = RandomEventType.None;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Start()
        {
            StartCoroutine(RandomEventRoutine());
        }

        IEnumerator RandomEventRoutine()
        {
            yield return new WaitForSeconds(5f); // Chờ đầu level ổn định

            while (true)
            {
                float waitTime = UnityEngine.Random.Range(minEventInterval, maxEventInterval);
                yield return new WaitForSeconds(waitTime);

                if (ActiveEvent == RandomEventType.None)
                    TriggerRandomEvent();
            }
        }

        void TriggerRandomEvent()
        {
            // Random 1 trong 5 sự cố
            var events = (RandomEventType[])Enum.GetValues(typeof(RandomEventType));
            var validEvents = new List<RandomEventType>();
            foreach (var e in events)
                if (e != RandomEventType.None) validEvents.Add(e);

            var chosen = validEvents[UnityEngine.Random.Range(0, validEvents.Count)];
            ActiveEvent = chosen;

            switch (chosen)
            {
                case RandomEventType.Blackout:        StartCoroutine(HandleBlackout());       break;
                case RandomEventType.KitchenFire:     StartCoroutine(HandleKitchenFire());    break;
                case RandomEventType.RushedCustomer:  HandleRushedCustomer();                  break;
                case RandomEventType.BrokenDishes:    HandleBrokenDishes();                    break;
                case RandomEventType.StaffStrike:     StartCoroutine(HandleStaffStrike());    break;
            }

            string hint = GetEventHint(chosen);
            OnEventTriggered?.Invoke(chosen, hint);
            Debug.Log($"[EventManager] 🚨 Sự cố: {chosen} — {hint}");
        }

        // ── Xử lý từng sự cố ────────────────────────────────────────────

        IEnumerator HandleBlackout()
        {
            IsBlackout = true;
            // TODO: tắt lights / overlay tối lên màn hình
            yield return new WaitForSeconds(5f);
            IsBlackout = false;
            ResolveEvent(RandomEventType.Blackout);
        }

        IEnumerator HandleKitchenFire()
        {
            if (allStations.Length == 0) yield break;

            // Random 1 station bốc lửa
            var station = allStations[UnityEngine.Random.Range(0, allStations.Length)];
            station.SetOnFire(true);

            // Chờ player dập tắt (PlayerController gọi ResolveKitchenFire)
            // Timeout sau 20 giây nếu không ai dập
            float timeout = 20f;
            float elapsed = 0f;
            while (station.IsOnFire && elapsed < timeout)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }

            station.SetOnFire(false);
            ResolveEvent(RandomEventType.KitchenFire);
        }

        void HandleRushedCustomer()
        {
            // Double reward cho 1 đơn hàng random + deadline 15s
            var orders = OrderSystem.Instance.ActiveOrders;
            if (orders.Count == 0) { ResolveEvent(RandomEventType.RushedCustomer); return; }

            var order = orders[UnityEngine.Random.Range(0, orders.Count)];
            order.baseReward *= 2;
            order.remainingTime = Mathf.Min(order.remainingTime, 15f);
            Debug.Log($"[EventManager] 🏃 Khách vội! '{order.orderName}' reward x2, chỉ còn 15s!");
            ResolveEvent(RandomEventType.RushedCustomer); // event tự resolve vì không cần action
        }

        void HandleBrokenDishes()
        {
            OrderSystem.Instance.AddExtraWashStep();
            Debug.Log("[EventManager] 🍽 Bát vỡ! Tất cả đơn hàng cần thêm bước rửa bát.");
            ResolveEvent(RandomEventType.BrokenDishes);
        }

        IEnumerator HandleStaffStrike()
        {
            // TODO: random chọn 1 player → set bất mãn 15 giây
            Debug.Log("[EventManager] 😤 Nhân viên bất mãn! 1 nhân vật ngồi suỵt 15 giây.");
            yield return new WaitForSeconds(15f);
            // TODO: hết thời gian → player trở lại bình thường
            ResolveEvent(RandomEventType.StaffStrike);
        }

        void ResolveEvent(RandomEventType eventType)
        {
            ActiveEvent = RandomEventType.None;
            OnEventResolved?.Invoke(eventType);
        }

        /// <summary>Gọi từ PlayerController khi nhân vật đứng ở vòi nước để dập lửa.</summary>
        public void TryExtinguishFire(DishStation station)
        {
            if (station.IsOnFire)
                station.SetOnFire(false);
        }

        string GetEventHint(RandomEventType eventType) => eventType switch
        {
            RandomEventType.Blackout        => "Cắt điện! Bấm nút đèn!",
            RandomEventType.KitchenFire     => "Bếp cháy! Đứng ở vòi nước 2 giây!",
            RandomEventType.RushedCustomer  => "Khách vội! Phục vụ trong 15 giây!",
            RandomEventType.BrokenDishes    => "Bát vỡ! Cần rửa bát trước!",
            RandomEventType.StaffStrike     => "Nhân viên bất mãn! Cover cho họ!",
            _ => ""
        };
    }

    public enum RandomEventType
    {
        None,
        Blackout,           // Cắt điện
        KitchenFire,        // Bếp cháy
        RushedCustomer,     // Khách vội
        BrokenDishes,       // Rửa bát vỡ
        StaffStrike         // Nhân viên bất mãn
    }
}
