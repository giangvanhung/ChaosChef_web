using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace ChaosChef.Gameplay
{
    /// <summary>
    /// GameManager — Trái tim của mỗi level.
    /// Quản lý: đồng hồ đếm ngược, trạng thái level, kết thúc level.
    ///
    /// Giống như MC game show: bắt đầu đếm giờ, nhắc thời gian còn lại,
    /// và công bố kết quả khi hết giờ.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Level Config")]
        [SerializeField] private float levelDuration = 180f; // 3 phút per level (GDD)
        [SerializeField] private string nextLevelScene = "";  // Scene tiếp theo

        // ── Runtime ──────────────────────────────────────────────────────
        public float RemainingTime { get; private set; }
        public GameState CurrentState { get; private set; } = GameState.WaitingToStart;

        // Events
        public event Action<float> OnTimerUpdated;    // Mỗi giây
        public event Action<int> OnLevelEnded;        // int = số sao (0–3)
        public event Action OnLevelStarted;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Start()
        {
            StartLevel();
        }

        void Update()
        {
            if (CurrentState != GameState.Playing) return;

            RemainingTime -= Time.deltaTime;
            OnTimerUpdated?.Invoke(RemainingTime);

            if (RemainingTime <= 0f)
            {
                RemainingTime = 0f;
                EndLevel();
            }
        }

        public void StartLevel()
        {
            RemainingTime = levelDuration;
            CurrentState = GameState.Playing;
            ScoreManager.Instance.Reset();
            OnLevelStarted?.Invoke();
            Debug.Log($"[GameManager] ▶ Level bắt đầu! Thời gian: {levelDuration}s");
        }

        /// <summary>
        /// Thêm thời gian vào đồng hồ (bonus từ đơn hàng hoàn thành đúng giờ).
        /// Ví dụ: Mì tôm cà chua → +10 giây
        /// </summary>
        public void AddBonusTime(float seconds)
        {
            RemainingTime += seconds;
            Debug.Log($"[GameManager] ⏱ +{seconds}s bonus! Còn lại: {RemainingTime:F1}s");
        }

        void EndLevel()
        {
            if (CurrentState == GameState.Ended) return;
            CurrentState = GameState.Ended;

            int stars = ScoreManager.Instance.CalculateStars();
            OnLevelEnded?.Invoke(stars);

            Debug.Log($"[GameManager] ⏹ Level kết thúc! {stars}⭐ — Tổng: {ScoreManager.Instance.TotalCoins} xu");
            StartCoroutine(ShowResultThenNext(stars));
        }

        IEnumerator ShowResultThenNext(int stars)
        {
            yield return new WaitForSeconds(3f); // Chờ UI kết quả hiện
            if (stars == 0)
            {
                // Fail → reload level hiện tại
                SceneManager.LoadScene(SceneManager.GetActiveScene().name);
            }
            else if (!string.IsNullOrEmpty(nextLevelScene))
            {
                SceneManager.LoadScene(nextLevelScene);
            }
        }

        /// <summary>Tạm dừng (khi open menu, disconnect...).</summary>
        public void PauseGame()
        {
            if (CurrentState != GameState.Playing) return;
            CurrentState = GameState.Paused;
            Time.timeScale = 0f;
        }

        public void ResumeGame()
        {
            if (CurrentState != GameState.Paused) return;
            CurrentState = GameState.Playing;
            Time.timeScale = 1f;
        }
    }

    public enum GameState
    {
        WaitingToStart,
        Playing,
        Paused,
        Ended
    }
}
