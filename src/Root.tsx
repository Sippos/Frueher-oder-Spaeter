import{useState}from"react";
import App from"./App";
export default function Root(){const[s,S]=useState(0);return s?<App/>:<main className="app"><section className="onboarding-panel"><h1>Früher oder Später?</h1><button className="primary-button" onClick={()=>S(1)}>Lokal spielen</button><button disabled>CPU</button><button disabled>Online</button><button disabled>Handbuch</button></section></main>}
