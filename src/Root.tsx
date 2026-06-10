import{useState}from"react";
import App from"./App";
export default function Root(){const[s,S]=useState(0);return s?<App/>:<main className="app"><section className="onboarding-panel"><h1>Frueher oder Spaeter?</h1><button className="primary-button" onClick={()=>S(1)}>Play local</button><button disabled>CPU</button><button disabled>Online</button><button disabled>Handbook</button></section></main>}
