namespace ChaosChef.StateMachine
{
    /// <summary>
    /// Base abstract class cho mọi state của nhân vật.
    ///
    /// Giống như trạng thái của người: "đứng yên", "đang nấu", "đang mang đĩa".
    /// Mỗi trạng thái có 3 giai đoạn: Enter → Update (mỗi frame) → Exit.
    /// </summary>
    public abstract class CharacterState
    {
        protected CharacterStateMachine StateMachine { get; }

        protected CharacterState(CharacterStateMachine stateMachine)
        {
            StateMachine = stateMachine;
        }

        /// <summary>Gọi 1 lần khi vào state này.</summary>
        public virtual void OnEnter() { }

        /// <summary>Gọi mỗi frame trong Update().</summary>
        public virtual void OnUpdate() { }

        /// <summary>Gọi mỗi frame trong FixedUpdate().</summary>
        public virtual void OnFixedUpdate() { }

        /// <summary>Gọi 1 lần khi thoát state này.</summary>
        public virtual void OnExit() { }
    }
}
