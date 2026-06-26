using UnityEngine;
using Mirror;
using ChaosChef.Data;
using ChaosChef.Gameplay;
using ChaosChef.StateMachine;

namespace ChaosChef.Networking
{
    /// <summary>
    /// PlayerController — gắn vào prefab Player.
    /// Xử lý input, di chuyển, và giao tiếp với Mirror server.
    ///
    /// Mirror hoạt động như thế này:
    ///   - isLocalPlayer = true  → đây là nhân vật CỦA BẠN (bạn điều khiển)
    ///   - isLocalPlayer = false → nhân vật của NGƯỜI KHÁC (chỉ nhận sync)
    ///
    /// Input chỉ đọc khi isLocalPlayer. Action được gửi lên server ([Command]),
    /// server xác nhận rồi broadcast lại cho tất cả ([ClientRpc]).
    /// </summary>
    [RequireComponent(typeof(CharacterStateMachine))]
    public class PlayerController : NetworkBehaviour
    {
        [Header("Config")]
        [SerializeField] private CharacterData characterData;
        [SerializeField] private int playerIndex = 0; // 0–3 cho 4 player

        // Input keys cho local multiplayer (1 máy 4 người)
        // Player 0: WASD + E
        // Player 1: Arrows + Numpad0
        // Player 2: IJKL + U
        // Player 3: gamepad (dùng Unity Input System)
        private static readonly KeyCode[] interactKeys = { KeyCode.E, KeyCode.Keypad0, KeyCode.U, KeyCode.JoystickButton0 };
        private static readonly string[] horizontalAxes = { "Horizontal", "Horizontal2", "Horizontal3", "Horizontal4" };
        private static readonly string[] verticalAxes   = { "Vertical",   "Vertical2",   "Vertical3",   "Vertical4" };

        private CharacterStateMachine _stateMachine;
        private DishStation _nearbyStation;

        void Awake()
        {
            _stateMachine = GetComponent<CharacterStateMachine>();
        }

        public override void OnStartLocalPlayer()
        {
            // Chỉ setup khi đây là player CỦA MÌNH
            _stateMachine.CharacterData = characterData;
            Debug.Log($"[PlayerController] Local player started: {characterData.characterName}");
        }

        void Update()
        {
            if (!isLocalPlayer) return;
            if (_stateMachine.IsStruck) return; // Đang bị bất mãn, không làm gì

            HandleMovementInput();
            HandleInteractInput();
        }

        void HandleMovementInput()
        {
            float h = Input.GetAxisRaw(horizontalAxes[playerIndex]);
            float v = Input.GetAxisRaw(verticalAxes[playerIndex]);
            _stateMachine.MoveInput = new Vector2(h, v).normalized;
        }

        void HandleInteractInput()
        {
            if (_nearbyStation == null) return;
            if (Input.GetKeyDown(interactKeys[playerIndex]))
            {
                CmdInteractWithStation(_nearbyStation.GetComponent<NetworkIdentity>().netId);
            }
        }

        // ── Mirror Commands (Client → Server) ────────────────────────────

        /// <summary>
        /// Gửi request lên server: "tôi muốn tương tác với station này".
        /// Server kiểm tra hợp lệ rồi mới cho phép.
        /// </summary>
        [Command]
        void CmdInteractWithStation(uint stationNetId)
        {
            if (!NetworkServer.spawned.TryGetValue(stationNetId, out var stationObj)) return;
            var station = stationObj.GetComponent<DishStation>();
            if (station == null || station.IsOccupied || station.IsOnFire) return;

            // Server xác nhận → broadcast cho tất cả client
            RpcStartCookingAnimation(stationNetId);
        }

        // ── Mirror ClientRpc (Server → All Clients) ───────────────────────

        /// <summary>
        /// Server broadcast: "player này bắt đầu nấu ở station đó".
        /// Tất cả client chạy animation đồng bộ.
        /// </summary>
        [ClientRpc]
        void RpcStartCookingAnimation(uint stationNetId)
        {
            if (!NetworkServer.spawned.TryGetValue(stationNetId, out var stationObj)) return;
            var station = stationObj.GetComponent<DishStation>();
            if (station == null) return;

            if (isLocalPlayer)
            {
                // Chỉ local player mới thực sự chuyển state
                _stateMachine.ChangeState(new CookState(_stateMachine, station));
            }
        }

        // ── Station Detection ─────────────────────────────────────────────

        void OnTriggerEnter2D(Collider2D other)
        {
            if (!isLocalPlayer) return;
            var station = other.GetComponent<DishStation>();
            if (station != null) _nearbyStation = station;
        }

        void OnTriggerExit2D(Collider2D other)
        {
            if (!isLocalPlayer) return;
            if (other.GetComponent<DishStation>() == _nearbyStation)
                _nearbyStation = null;
        }
    }
}
