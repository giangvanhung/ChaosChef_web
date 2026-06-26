using UnityEngine;

namespace ChaosChef.Data
{
    /// <summary>
    /// Một bước trong chuỗi chế biến món ăn.
    /// Ví dụ: "Nấu mì" là 1 bước, "Xếp cà chua" là bước tiếp theo.
    /// </summary>
    [System.Serializable]
    public class OrderStep
    {
        [Header("Thông tin bước")]
        public string stepName;          // Tên bước: "Nấu mì", "Xếp cà chua"...
        public float duration;           // Thời gian hoàn thành bước (giây)
        public StationType requiredStation; // Cần đứng ở station nào

        [Header("Giới hạn nhân vật")]
        public CharacterRole[] allowedRoles; // Nếu rỗng = ai cũng làm được
    }

    public enum StationType
    {
        CookingPot,     // Bếp nấu mì
        CuttingBoard,   // Bàn chặt rau
        Sink,           // Vòi rửa bát
        PlateCounter,   // Bàn xếp đĩa
        ServingWindow   // Cửa sổ phục vụ
    }

    public enum CharacterRole
    {
        DauBepSon,      // Nấu mì nhanh x2, không rửa bát
        PhuBepLan,      // Chặt rau + rửa bát nhanh, nấu mì chậm
        TapVuTuan,      // Mang đĩa + gọi khách, di chuyển chậm
        HocViecHuy      // Cân bằng, tất cả trung bình
    }
}
