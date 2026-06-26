using UnityEngine;

namespace ChaosChef.StateMachine
{
    /// <summary>
    /// State: Đứng yên / đi lại.
    /// Nhân vật di chuyển tự do, chờ input.
    /// </summary>
    public class IdleState : CharacterState
    {
        public IdleState(CharacterStateMachine sm) : base(sm) { }

        public override void OnEnter()
        {
            StateMachine.Animator.SetBool("IsWalking", false);
        }

        public override void OnFixedUpdate()
        {
            // Di chuyển theo input
            var velocity = StateMachine.MoveInput * StateMachine.CharacterData.moveSpeed;
            StateMachine.Rb.linearVelocity = velocity;

            // Update animation
            bool isMoving = StateMachine.MoveInput.sqrMagnitude > 0.01f;
            StateMachine.Animator.SetBool("IsWalking", isMoving);

            // Flip sprite theo hướng đi
            if (StateMachine.MoveInput.x != 0)
            {
                float scaleX = StateMachine.MoveInput.x > 0 ? 1f : -1f;
                var scale = StateMachine.transform.localScale;
                scale.x = Mathf.Abs(scale.x) * scaleX;
                StateMachine.transform.localScale = scale;
            }
        }

        public override void OnExit()
        {
            StateMachine.Rb.linearVelocity = Vector2.zero;
        }
    }
}
