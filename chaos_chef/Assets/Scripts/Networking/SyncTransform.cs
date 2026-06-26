using UnityEngine;
using Mirror;

namespace ChaosChef.Networking
{
    /// <summary>
    /// Sync vị trí và flip sprite của nhân vật qua mạng.
    ///
    /// Vì sao cần file này thay vì dùng Mirror's NetworkTransform?
    ///   Mirror's NetworkTransform sync nhiều thứ (rotation, scale...) tốn bandwidth.
    ///   Game 2D top-down chỉ cần sync: position + flip X.
    ///   File này nhẹ hơn, đủ dùng cho Chaos Chef.
    ///
    /// Gắn vào Player prefab cùng với PlayerController.
    /// </summary>
    public class SyncTransform : NetworkBehaviour
    {
        [Header("Smoothing")]
        [SerializeField] private float lerpSpeed = 15f;

        // SyncVar: khi server thay đổi → tự động sync đến tất cả clients
        [SyncVar] private Vector3 _syncPosition;
        [SyncVar] private bool _flipX;

        private Transform _transform;

        void Awake()
        {
            _transform = transform;
        }

        void Update()
        {
            if (isLocalPlayer)
            {
                // Chỉ owner gửi position lên server
                if (Vector3.Distance(_transform.position, _syncPosition) > 0.05f)
                    CmdSyncTransform(_transform.position, _transform.localScale.x < 0);
            }
            else
            {
                // Các client khác interpolate (smooth) vị trí nhận được
                _transform.position = Vector3.Lerp(
                    _transform.position,
                    _syncPosition,
                    Time.deltaTime * lerpSpeed
                );

                // Sync flip sprite
                var scale = _transform.localScale;
                scale.x = _flipX ? -Mathf.Abs(scale.x) : Mathf.Abs(scale.x);
                _transform.localScale = scale;
            }
        }

        [Command]
        void CmdSyncTransform(Vector3 position, bool flipX)
        {
            _syncPosition = position;
            _flipX = flipX;
        }
    }
}
