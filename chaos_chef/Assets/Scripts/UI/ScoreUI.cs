using UnityEngine;
using TMPro;
using ChaosChef.Gameplay;

namespace ChaosChef.UI
{
    /// <summary>
    /// Hiển thị điểm số và đồng hồ đếm ngược.
    ///
    /// Cần trong Inspector:
    ///   - coinText: "💰 3,500 xu"
    ///   - timerText: "⏱ 2:34"
    ///   - resultPanel: Panel kết quả cuối level (ẩn khi đang chơi)
    /// </summary>
    public class ScoreUI : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI coinText;
        [SerializeField] private TextMeshProUGUI timerText;
        [SerializeField] private GameObject resultPanel;
        [SerializeField] private TextMeshProUGUI resultStarText;
        [SerializeField] private TextMeshProUGUI resultCoinText;

        void OnEnable()
        {
            ScoreManager.Instance.OnCoinsChanged  += UpdateCoins;
            GameManager.Instance.OnTimerUpdated   += UpdateTimer;
            GameManager.Instance.OnLevelEnded     += ShowResult;
        }

        void OnDisable()
        {
            if (ScoreManager.Instance != null) ScoreManager.Instance.OnCoinsChanged -= UpdateCoins;
            if (GameManager.Instance  != null)
            {
                GameManager.Instance.OnTimerUpdated -= UpdateTimer;
                GameManager.Instance.OnLevelEnded   -= ShowResult;
            }
        }

        void Start()
        {
            if (resultPanel != null) resultPanel.SetActive(false);
            UpdateCoins(0);
        }

        void UpdateCoins(int coins)
        {
            if (coinText != null)
                coinText.text = $"💰 {coins:N0} xu";
        }

        void UpdateTimer(float remaining)
        {
            if (timerText == null) return;

            int minutes = Mathf.FloorToInt(remaining / 60f);
            int seconds = Mathf.FloorToInt(remaining % 60f);
            timerText.text = $"⏱ {minutes}:{seconds:00}";

            // Đổi màu đỏ khi còn < 30 giây
            timerText.color = remaining < 30f ? Color.red : Color.white;
        }

        void ShowResult(int stars)
        {
            if (resultPanel != null) resultPanel.SetActive(true);

            string starStr = stars switch
            {
                3 => "⭐⭐⭐",
                2 => "⭐⭐",
                1 => "⭐",
                _ => "❌ Thất bại!"
            };

            if (resultStarText != null) resultStarText.text = starStr;
            if (resultCoinText != null)
                resultCoinText.text = $"Tổng: {ScoreManager.Instance.TotalCoins:N0} xu";
        }
    }
}
