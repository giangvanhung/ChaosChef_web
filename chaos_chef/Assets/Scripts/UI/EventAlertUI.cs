using System.Collections;
using UnityEngine;
using TMPro;
using ChaosChef.Gameplay;

namespace ChaosChef.UI
{
    /// <summary>
    /// Hiển thị cảnh báo sự cố bất ngờ ở góc màn hình.
    ///
    /// Khi "Bếp Cháy" xảy ra → icon 🔥 + text "Đứng ở vòi nước 2 giây!" nhảy lên.
    ///
    /// Cần trong Inspector:
    ///   - alertPanel: Panel chứa icon + text (bình thường ẩn)
    ///   - eventIconText: TextMeshPro hiển thị emoji icon
    ///   - eventHintText: TextMeshPro hiển thị gợi ý hành động
    ///   - blackoutOverlay: Image toàn màn hình (tối đen) cho sự cố cắt điện
    /// </summary>
    public class EventAlertUI : MonoBehaviour
    {
        [SerializeField] private GameObject alertPanel;
        [SerializeField] private TextMeshProUGUI eventIconText;
        [SerializeField] private TextMeshProUGUI eventHintText;
        [SerializeField] private GameObject blackoutOverlay;

        [Header("Animation")]
        [SerializeField] private float alertDisplayTime = 4f;

        private Coroutine _hideCoroutine;

        void OnEnable()
        {
            EventManager.Instance.OnEventTriggered += ShowAlert;
            EventManager.Instance.OnEventResolved  += OnEventResolved;
        }

        void OnDisable()
        {
            if (EventManager.Instance == null) return;
            EventManager.Instance.OnEventTriggered -= ShowAlert;
            EventManager.Instance.OnEventResolved  -= OnEventResolved;
        }

        void Start()
        {
            if (alertPanel     != null) alertPanel.SetActive(false);
            if (blackoutOverlay != null) blackoutOverlay.SetActive(false);
        }

        void ShowAlert(RandomEventType eventType, string hint)
        {
            // Icon theo loại sự cố
            string icon = eventType switch
            {
                RandomEventType.Blackout        => "🔌",
                RandomEventType.KitchenFire     => "🔥",
                RandomEventType.RushedCustomer  => "🏃",
                RandomEventType.BrokenDishes    => "🍽",
                RandomEventType.StaffStrike     => "😤",
                _ => "⚠️"
            };

            if (eventIconText != null) eventIconText.text = icon;
            if (eventHintText != null) eventHintText.text = hint;
            if (alertPanel    != null) alertPanel.SetActive(true);

            // Cắt điện → bật overlay tối
            if (eventType == RandomEventType.Blackout && blackoutOverlay != null)
                blackoutOverlay.SetActive(true);

            // Auto-hide sau vài giây
            if (_hideCoroutine != null) StopCoroutine(_hideCoroutine);
            _hideCoroutine = StartCoroutine(HideAfterDelay());
        }

        void OnEventResolved(RandomEventType eventType)
        {
            // Cắt điện kết thúc → tắt overlay
            if (eventType == RandomEventType.Blackout && blackoutOverlay != null)
                blackoutOverlay.SetActive(false);
        }

        IEnumerator HideAfterDelay()
        {
            yield return new WaitForSeconds(alertDisplayTime);
            if (alertPanel != null) alertPanel.SetActive(false);
        }
    }
}
