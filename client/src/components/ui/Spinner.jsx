import './Spinner.css';

function Spinner({ message = 'Loading...' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <p className="spinner__message">{message}</p>
    </div>
  );
}

export default Spinner;
