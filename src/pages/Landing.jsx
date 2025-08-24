import { Link } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  return (
    <section className="hero--full">
      <div className="hero__center">
        <div className="hero__panel">
          <img
            className="hero__logo"
            src="/images/logo-viking.svg"
            alt="Shop"
            onError={(e) => {
              e.currentTarget.src = "/images/logo-viking.png";
            }}
          />
          <h1 className="hero__title">Blades of the North</h1>
          <div className="hero__cta">
            <Link to="/book">
              <button className="btn btn--primary btn--xl">Book a Chair</button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
