using System.Collections;
using UnityEngine;

namespace ChaosChef.StateMachine
{
    /// <summary>
    /// State: Nhân viên bất mãn — "ngồi suỵt".
    /// Nhân vật ngồi xuống, không làm gì được, tự recover sau `duration` giây.
    ///
    /// Tương đương với character bị stunned trong fighting game.
    /// </summary>
    public class StrikeState : CharacterState
    {
        private readonly float _duration;
        private float _elapsed;

        public StrikeState(CharacterStateMachine sm, float duration) : base(sm)
        {
            _duration = duration;
        }

        public override void OnEnter()
        {
            _elapsed = 0f;
            StateMachine.Rb.linearVelocity = Vector2.zero;
            StateMachine.Animator.SetTrigger("Strike"); // animation ngồi suỵt
            StateMachine.IsStruck = true;
            Debug.Log($"[StrikeState] 😤 {StateMachine.CharacterData.characterName} bất mãn {_duration}s!");
        }

        public override void OnUpdate()
        {
            _elapsed += Time.deltaTime;
            if (_elapsed >= _duration)
            {
                StateMachine.ChangeState(new IdleState(StateMachine));
            }
        }

        public override void OnExit()
        {
            StateMachine.IsStruck = false;
            StateMachine.Animator.SetTrigger("RecoverFromStrike");
        }
    }
}
