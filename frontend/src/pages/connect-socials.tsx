import styles from '../assets/styles/settings.module.css';

function ConnectSocials() {
  return (
    <div className={styles.page}>

      {/* Settings sidebar */}
      <aside className={styles.sidebar}>
        <button type="button" className={styles.sidebarItem}>
          Account
        </button>

        <button
          type="button"
          className={`${styles.sidebarItem} ${styles.active}`}
        >
          Connect Socials
        </button>

        <button type="button" className={styles.sidebarItem}>
          Privacy
        </button>

        <button type="button" className={styles.sidebarItem}>
          Preferences
        </button>

        <button type="button" className={styles.sidebarItem}>
          Notifications
        </button>
      </aside>

      {/* Connect socials content */}
      <main className={styles.content}>
        <h1 className={styles.heading}>
          <span className={styles.mobileBack}>‹</span>
          Connect Socials
        </h1>

        <p className={styles.description}>
          Connecting your social media accounts will allow
          you to seamlessly share events with friends.
          You will also be able to easily repost your
          reviews that you were already making.
        </p>

        {/* Instagram */}
        <div className={styles.settingRow}>
          <h2 className={styles.sectionTitle}>
            Instagram
          </h2>

          <button
            type="button"
            className={styles.actionButton}
          >
            Connect
          </button>
        </div>

        {/* Facebook */}
        <div className={styles.settingRow}>
          <h2 className={styles.sectionTitle}>
            Facebook
          </h2>

          <div className={styles.verifiedStatus}>
            <span className={styles.statusText}>
              Verified
            </span>

            <span>✓</span>

            <button
              type="button"
              className={styles.actionButton}
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* TikTok */}
        <div className={styles.settingRow}>
          <h2 className={styles.sectionTitle}>
            TikTok
          </h2>

          <div className={styles.pendingStatus}>
            <span className={styles.statusText}>
              Pending
            </span>

            <span>◌</span>

            <button
              type="button"
              className={styles.actionButton}
              disabled
            >
              Disconnect
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ConnectSocials;