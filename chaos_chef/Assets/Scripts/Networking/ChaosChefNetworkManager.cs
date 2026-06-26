using System.Collections.Generic;
using UnityEngine;
using Mirror;

namespace ChaosChef.Networking
{
    /// <summary>
    /// NetworkManager tùy chỉnh cho Chaos Chef.
    /// Kế thừa Mirror's NetworkManager, thêm logic spawn nhân vật theo slot.
    ///
    /// Gắn vào GameObject "NetworkManager" trong scene MainMenu và Level.
    /// Nhớ gán: playerPrefab, networkAddress, transport (KcpTransport).
    /// </summary>
    public class ChaosChefNetworkManager : NetworkManager
    {
        [Header("Chaos Chef Config")]
        [SerializeField] private List<GameObject> characterPrefabs = new(); // 4 nhân vật prefab theo thứ tự
        [SerializeField] private List<Transform> spawnPoints = new();       // Vị trí spawn trong level

        private int _playerCount = 0;

        public override void OnServerAddPlayer(NetworkConnectionToClient conn)
        {
            int index = _playerCount % Mathf.Max(characterPrefabs.Count, 1);

            // Spawn prefab nhân vật tương ứng
            var prefab  = characterPrefabs.Count > 0 ? characterPrefabs[index] : playerPrefab;
            var spawnPos = spawnPoints.Count > index ? spawnPoints[index].position : Vector3.zero;

            var player = Instantiate(prefab, spawnPos, Quaternion.identity);
            NetworkServer.AddPlayerForConnection(conn, player);

            _playerCount++;
            Debug.Log($"[NetworkManager] Player {_playerCount} connected → slot {index}");
        }

        public override void OnServerDisconnect(NetworkConnectionToClient conn)
        {
            _playerCount = Mathf.Max(0, _playerCount - 1);
            base.OnServerDisconnect(conn);
        }

        public override void OnStopServer()
        {
            _playerCount = 0;
            base.OnStopServer();
        }
    }
}
