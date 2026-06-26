using UnityEngine;
using ChaosChef.Gameplay;

namespace ChaosChef.StateMachine
{
    /// <summary>
    /// State: Đang nấu / thực hiện action tại station.
    /// Nhân vật đứng yên, thực hiện animation nấu, không thể di chuyển.
    ///
    /// Giống như khi bạn đang dùng lò vi sóng: bạn không bỏ đi được,
    /// phải đứng chờ ding xong mới đi.
    /// </summary>
    public class CookState : CharacterState
    {
        private readonly DishStation _station;

        public CookState(CharacterStateMachine sm, DishStation station) : base(sm)
        {
            _station = station;
        }

        public override void OnEnter()
        {
            StateMachine.Rb.linearVelocity = Vector2.zero;
            StateMachine.Animator.SetTrigger("StartCooking");

            // Bắt đầu action tại station
            var data = StateMachine.CharacterData;
            float speedMult = data.GetSpeedMultiplier(_station.stationType);
            _station.StartInteraction(
                StateMachine.gameObject,
                data.role,
                speedMult
            );
        }

        public override void OnUpdate()
        {
            // Nếu không còn occupied nữa → action xong, quay về idle
            if (!_station.IsOccupied)
            {
                StateMachine.ChangeState(new IdleState(StateMachine));
            }
        }

        public override void OnExit()
        {
            StateMachine.Animator.SetBool("IsCooking", false);
        }
    }
}
