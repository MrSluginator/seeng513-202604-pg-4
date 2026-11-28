import { useState } from 'react';
import styles from '../assets/styles/settings.module.css';

function Notifications() {
  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [notificationOptions, setNotificationOptions] =
    useState([
      {
        label: 'Events that I RSVPed to are starting soon',
        enabled: false,
      },
      {
        label: 'My RSVPed events have updates',
        enabled: true,
      },
      {
        label: 'Flare finds events that may interest me',
        enabled: true,
      },
      {
        label: 'New events in my area are created',
        enabled: false,
      },
      {
        label: 'There are trending events in my area',
        enabled: false,
      },
      {
        label: 'People send me sparks',
        enabled: true,
      },
    ]);

  function toggleNotification(index: number) {
    setNotificationOptions((previousOptions) =>
      previousOptions.map((option, i) =>
        i === index
          ? { ...option, enabled: !option.enabled }
          : option
      )
    );
  }

  return (
    <div className={styles.page}>

      {/* Settings sidebar */}
      <aside className={styles.sidebar}>
        <button type="button" className={styles.sidebarItem}>
          Account
        </button>

        <button type="button" className={styles.sidebarItem}>
          Connect Socials
        </button>

        <button type="button" className={styles.sidebarItem}>
          Privacy
        </button>

        <button type="button" className={styles.sidebarItem}>
          Preferences
        </button>

        <button
          type="button"
          className={`${styles.sidebarItem} ${styles.active}`}
        >
          Notifications
        </button>
      </aside>

      {/* Notifications content */}
      <main className={styles.content}>
        <h1 className={styles.heading}>
          <span className={styles.mobileBack}>‹</span>
          Notifications
        </h1>

        {/* Email notifications */}
        <section className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>
            Email Notifications
          </h2>

          <div className={styles.optionRow}>
            <p className={styles.smallText}>
              Allow Flare to send you emails according
              to your preferences
            </p>

            <button
              type="button"
              role="switch"
              aria-label="Email notifications"
              aria-checked={emailNotifications}
              className={`${styles.toggle} ${
                emailNotifications ? styles.toggleActive : ''
              }`}
              onClick={() =>
                setEmailNotifications(!emailNotifications)
              }
            >
              <span className={styles.toggleThumb}></span>
            </button>
          </div>
        </section>

        {/* Notification preferences */}
        <section className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>
            Notify Me When...
          </h2>

          {notificationOptions.map((option, index) => (
            <div
              key={option.label}
              className={styles.notificationRow}
            >
              <p className={styles.smallText}>
                {option.label}
              </p>

              <button
                type="button"
                role="switch"
                aria-label={option.label}
                aria-checked={option.enabled}
                className={`${styles.toggle} ${
                  option.enabled ? styles.toggleActive : ''
                }`}
                onClick={() => toggleNotification(index)}
              >
                <span className={styles.toggleThumb}></span>
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default Notifications;