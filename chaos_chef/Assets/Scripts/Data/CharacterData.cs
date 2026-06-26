using UnityEngine;
using ChaosChef.Data;

namespace ChaosChef.Data
{
    /// <summary>
    /// ScriptableObject lưu thông số nhân vật.
    /// Tạo asset: Right-click → Create → ChaosChef → CharacterData
    ///
    /// 4 nhân vật trong GDD:
    ///   - Đầu Bếp Sơn: cook x2, không rửa bát
    ///   - Phụ Bếp Lan:  chặt + rửa nhanh, cook chậm
    ///   - Tạp Vụ Tuấn:  mang đĩa nhanh, đi chậm
    ///   - Học Việc Huy: cân bằng, tất cả trung bình
    /// </summary>
    [CreateAssetMenu(menuName = "ChaosChef/CharacterData", fileName = "NewCharacterData")]
    public class CharacterData : ScriptableObject
    {
        [Header("Định danh")]
        public string characterName;
        public CharacterRole role;
        public Sprite portrait;
        public RuntimeAnimatorController animatorController;

        [Header("Di chuyển")]
        public float moveSpeed = 5f;

        [Header("Hệ số tốc độ theo từng loại action (1.0 = bình thường)")]
        public float cookingSpeedMultiplier  = 1f;  // Bếp nấu
        public float cuttingSpeedMultiplier  = 1f;  // Chặt rau
        public float washingSpeedMultiplier  = 1f;  // Rửa bát
        public float servingSpeedMultiplier  = 1f;  // Phục vụ

        [Header("Hạn chế (true = không thể làm việc này)")]
        public bool cannotWashDishes = false;  // Đầu Bếp Sơn
        public bool slowCooking      = false;  // Phụ Bếp Lan
        public bool slowMovement     = false;  // Tạp Vụ Tuấn

        /// <summary>
        /// Trả về multiplier tốc độ cho một StationType cụ thể.
        /// </summary>
        public float GetSpeedMultiplier(StationType stationType)
        {
            return stationType switch
            {
                StationType.CookingPot   => slowCooking ? 0.6f : cookingSpeedMultiplier,
                StationType.CuttingBoard => cuttingSpeedMultiplier,
                StationType.Sink         => cannotWashDishes ? 0f : washingSpeedMultiplier,
                StationType.ServingWindow => servingSpeedMultiplier,
                _ => 1f
            };
        }

        public bool CanPerformAt(StationType stationType)
        {
            if (stationType == StationType.Sink && cannotWashDishes) return false;
            return true;
        }
    }
}
