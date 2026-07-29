import React from "react";

export default class Jumbotron extends React.Component {
  render() {
    const {image, title, subtitle} = this.props;
    return <div>
      <div className="pv6 pv7-l ph3 bg-center cover" style={{
        backgroundImage: image && `linear-gradient(120deg, rgba(18,28,22,.55), rgba(18,28,22,.2)), url(${image})`
      }}>
        <div className="mw7 center ph3">
          <div className="db mb3">
            <div className="mw7 relative bg-fix-primary mb3">
              <h1 className="f2 f1-l b di lh-title mb3 white mw6 bg-primary display">
                { title }
              </h1>
            </div>
            <div className="mw7 relative bg-fix-primary">
              {subtitle && <p className="b f4 di lh-title mb3 white mw6 bg-primary">{ subtitle }</p>}
            </div>
          </div>
        </div>
      </div>
    </div>;
  }
}
