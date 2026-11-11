import styles from '../styles/footer.module.css';

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.section}>
          <h3>Company</h3>
          <a href="/about">About us</a>
          <a href="/privacy">Privacy policy</a>
        </div>

        <div className={styles.section}>
          <h3>Help</h3>
          <a href="/contact">Contact us</a>
          <a href="/faq">FAQ</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;