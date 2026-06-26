using UnityEngine;

namespace ChaosChef.StateMachine
{
    /// <summary>
    /// State machine gắn vào mỗi nhân vật.
    /// Giữ state hiện tại và điều phối việc chuyển đổi giữa các state.
    ///
    /// Cách dùng:
    ///   stateMachine.ChangeState(new IdleState(stateMachine));
    ///   stateMachine.ChangeState(new CookState(stateMachine, station));
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(Animator))]
    public class CharacterStateMachine : MonoBehaviour
    {
        // References
        [HideInInspector] public Rigidbody2D Rb;
        [HideInInspector] public Animator Animator;

        public CharacterState CurrentState { get; private set; }

        // Dữ liệu nhân vật (set từ PlayerController)
        [HideInInspector] public ChaosChef.Data.CharacterData CharacterData;
        [HideInInspector] public Vector2 MoveInput;
        [HideInInspector] public bool IsStruck; // Bị "nhân viên bất mãn" — không làm gì được

        void Awake()
        {
            Rb       = GetComponent<Rigidbody2D>();
            Animator = GetComponent<Animator>();
        }

        void Start()
        {
            ChangeState(new IdleState(this));
        }

        void Update()
        {
            CurrentState?.OnUpdate();
        }

        void FixedUpdate()
        {
            CurrentState?.OnFixedUpdate();
        }

        public void ChangeState(CharacterState newState)
        {
            CurrentState?.OnExit();
            CurrentState = newState;
            CurrentState.OnEnter();
        }

        /// <summary>
        /// Gọi từ EventManager khi "Nhân Viên Bất Mãn" xảy ra.
        /// Nhân vật ngồi suỵt, không làm gì được 15 giây.
        /// </summary>
        public void TriggerStrike(float duration)
        {
            ChangeState(new StrikeState(this, duration));
        }
    }
}
