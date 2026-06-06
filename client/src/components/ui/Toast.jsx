import './Toast.css';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

function Toast({ message, type = 'success' }) {
  return (
    <div className={`toast toast--${type}`}>
      <span className="toast__icon">{ICONS[type]}</span>
      <span className="toast__message">{message}</span>
    </div>
  );
}

export default Toast;
