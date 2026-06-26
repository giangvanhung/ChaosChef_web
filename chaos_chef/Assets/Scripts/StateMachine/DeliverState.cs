using UnityEngine;
using ChaosChef.Gameplay;

namespace ChaosChef.StateMachine
{
    /// <summary>
    /// State: Đang mang đĩa / phục vụ khách.
    /// Nhân vật di chuyển chậm hơn (vì đang cầm đĩa),
    /// hướng tới ServingWindow để complete đơn hàng.
    /// </summary>
    public class DeliverState : CharacterState
    {
        private const float SLOW_FACTOR = 0.7f; // Đi chậm hơn 30% khi mang đĩa

        public DeliverState(CharacterStateMachine sm) : base(sm) { }

        public override void OnEnter()
        {
            StateMachine.Animator.SetBool("IsCarrying", true);
        }

        public override void OnFixedUpdate()
        {
            // Di chuyển chậm hơn
            float speed = StateMachine.CharacterData.moveSpeed * SLOW_FACTOR;
            // Tạp Vụ Tuấn di chuyển chậm ngay cả khi không mang đĩa,
            // nhưng bonus deliver speed bù lại
            float servingMult = StateMachine.CharacterData.servingSpeedMultiplier;
            StateMachine.Rb.linearVelocity = StateMachine.MoveInput * speed * servingMult;
        }

        public override void OnExit()
        {
            StateMachine.Animator.SetBool("IsCarrying", false);
            StateMachine.Rb.linearVelocity = Vector2.zero;
        }
    }
}
