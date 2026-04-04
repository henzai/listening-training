import { Link } from "react-router-dom";
import styles from "./Home.module.css";

export function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Shadowing Training</h1>
      <p className={styles.subtitle}>英語シャドーイング練習</p>
      <div className={styles.actions}>
        <Link to="/generate" className={styles.button}>
          新しいスクリプトを生成
        </Link>
        <Link to="/library" className={styles.buttonSecondary}>
          ライブラリを見る
        </Link>
      </div>
    </div>
  );
}
