using System.Collections;
using UnityEngine;
using ChaosChef.Data;

namespace ChaosChef.Gameplay
{
    /// <summary>
    /// Gắn vào mỗi station trong bếp (bếp nấu, bàn chặt, vòi rửa...).
    ///
    /// Giống như máy ATM: nhân vật đến gần → nhấn interact → chờ progress bar → done.
    /// Nếu bỏ đi giữa chừng → bị huỷ, phải bắt đầu lại.
    /// </summary>
    public class DishStation : MonoBehaviour
    {
        [Header("Loại station")]
        public StationType stationType;

        [Header("Interaction")]
        [SerializeField] private float interactionRadius = 1.5f;
        [SerializeField] private GameObject interactionPromptUI; // UI "Nhấn E để tương tác"
        [SerializeField] private GameObject progressBarUI;       // UI thanh tiến trình

        // ── Runtime ──────────────────────────────────────────────────────
        public bool IsOnFire { get; private set; }
        public bool IsOccupied => currentUser != null;

        private GameObject currentUser;
        private Coroutine actionCoroutine;

        void Update()
        {
            // Nếu không có ai đang làm → ẩn progress bar
            if (!IsOccupied && progressBarUI != null)
                progressBarUI.SetActive(false);
        }

        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Player"))
                ShowPrompt(true);
        }

        void OnTriggerExit2D(Collider2D other)
        {
            if (other.CompareTag("Player"))
            {
                ShowPrompt(false);
                // Nếu người dùng đang làm mà đi ra → cancel
                if (currentUser == other.gameObject)
                    CancelAction();
            }
        }

        void ShowPrompt(bool show)
        {
            if (interactionPromptUI != null)
                interactionPromptUI.SetActive(show && !IsOnFire && !IsOccupied);
        }

        /// <summary>
        /// Gọi từ PlayerController khi nhấn interact.
        /// </summary>
        public void StartInteraction(GameObject player, CharacterRole role, float speedMultiplier)
        {
            if (IsOnFire)
            {
                Debug.Log("[DishStation] Bếp đang cháy! Không thể dùng.");
                return;
            }
            if (IsOccupied)
            {
                Debug.Log("[DishStation] Station đang có người dùng.");
                return;
            }

            // Kiểm tra đơn hàng có cần station này không
            bool advanced = OrderSystem.Instance.TryAdvanceStep(stationType, role);
            if (!advanced)
            {
                // Không có đơn nào cần station này ngay lúc này
                ShowWrongOrderFeedback();
                return;
            }

            currentUser = player;
            actionCoroutine = StartCoroutine(PerformActionRoutine(speedMultiplier));
        }

        IEnumerator PerformActionRoutine(float speedMultiplier)
        {
            float duration = 2f / Mathf.Max(speedMultiplier, 0.1f); // Tránh chia 0

            if (progressBarUI != null) progressBarUI.SetActive(true);

            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                // TODO: cập nhật thanh progress bar (elapsed / duration)
                yield return null;
            }

            FinishAction();
        }

        void FinishAction()
        {
            currentUser = null;
            actionCoroutine = null;
            if (progressBarUI != null) progressBarUI.SetActive(false);
            PlaySuccessAnimation();
        }

        void CancelAction()
        {
            if (actionCoroutine != null) StopCoroutine(actionCoroutine);
            currentUser = null;
            actionCoroutine = null;
            if (progressBarUI != null) progressBarUI.SetActive(false);
        }

        /// <summary>Gọi từ EventManager khi "Bếp Cháy" xảy ra.</summary>
        public void SetOnFire(bool onFire)
        {
            IsOnFire = onFire;
            // TODO: bật/tắt particle effect lửa
            if (onFire) CancelAction(); // huỷ action đang làm
            Debug.Log(onFire ? $"[DishStation] 🔥 {stationType} bốc lửa!" : $"[DishStation] {stationType} đã tắt lửa.");
        }

        void ShowWrongOrderFeedback()
        {
            Debug.Log($"[DishStation] ❌ Sai thứ tự! Không có đơn hàng nào cần {stationType} lúc này.");
            // TODO: hiện popup "! Sai rồi!" trên đầu nhân vật
        }

        void PlaySuccessAnimation()
        {
            // TODO: particle effect hoặc animation hoàn thành
        }

        void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, interactionRadius);
        }
    }
}
