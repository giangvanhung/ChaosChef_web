using UnityEngine;
using System;

namespace ChaosChef.Gameplay
{
    /// <summary>
    /// Quản lý điểm số và đánh giá sao cuối level.
    /// Singleton — GameManager giữ reference đến cái này.
    /// </summary>
    public class ScoreManager : MonoBehaviour
    {
        public static ScoreManager Instance { get; private set; }

        [Header("Mục tiêu level (set trong Inspector)")]
        public int goldTarget;   // 3 sao nếu >= goldTarget

        // ── Runtime ──────────────────────────────────────────────────────
        public int TotalCoins { get; private set; }
        public int OrdersCompleted { get; private set; }
        public int OrdersFailed { get; private set; }

        // Event để UI lắng nghe
        public event Action<int> OnCoinsChanged;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void AddCoins(int amount)
        {
            TotalCoins += amount;
            if (TotalCoins < 0) TotalCoins = 0; // không xuống âm
            OnCoinsChanged?.Invoke(TotalCoins);
        }

        public void RegisterOrderResult(bool success)
        {
            if (success) OrdersCompleted++;
            else OrdersFailed++;
        }

        /// <summary>
        /// Tính rating sao cuối level.
        ///   >= 100% target → 3 sao
        ///   >= 70%          → 2 sao
        ///   >= 40%          → 1 sao
        ///   < 40%           → 0 sao (fail)
        /// </summary>
        public int CalculateStars()
        {
            if (goldTarget <= 0) return 3;
            float ratio = (float)TotalCoins / goldTarget;

            if (ratio >= 1.0f) return 3;
            if (ratio >= 0.7f) return 2;
            if (ratio >= 0.4f) return 1;
            return 0;
        }

        public void Reset()
        {
            TotalCoins = 0;
            OrdersCompleted = 0;
            OrdersFailed = 0;
            OnCoinsChanged?.Invoke(0);
        }
    }
}
