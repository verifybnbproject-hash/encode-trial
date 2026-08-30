"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [address, setAddress] = useState("TVnDbMnPjR6EhEo");
  const [amount, setAmount] = useState("");
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const handleAddressInput = (value: string) => setAddress(value);

  const handleAmountInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
    setAmount(sanitized);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text);
    } catch {
      setAddress("TVnDbMnPjR6EhEo");
    }
  };

  const handleNext = () => {
    if (!address.trim()) {
      alert("Please enter an address");
      return;
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    alert(`Sending ${amount} USDT to ${address}`);
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.header}>
        <button className={styles.backBtn} aria-label="Go back" type="button">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className={styles.headerTitle}>Send USDT</h1>
      </header>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Address or Domain Name</label>
        <div className={`${styles.inputBox} ${isAddressFocused ? styles.focused : ""}`}>
          <input
            type="text"
            className={styles.inputField}
            value={address}
            placeholder="Enter address"
            autoComplete="off"
            spellCheck={false}
            onFocus={() => setIsAddressFocused(true)}
            onBlur={() => setIsAddressFocused(false)}
            onChange={(event) => handleAddressInput(event.target.value)}
          />

          <div className={styles.inputActions}>
            <button
              type="button"
              className={`${styles.clearBtn} ${address ? styles.visible : ""}`}
              aria-label="Clear address"
              onClick={() => setAddress("")}
            >
              ✕
            </button>

            <button type="button" className={styles.actionLink} onClick={handlePaste}>
              Paste
            </button>

            <button type="button" className={styles.iconBtn} aria-label="Address book">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <line x1="9" y1="7" x2="15" y2="7" />
                <line x1="9" y1="11" x2="13" y2="11" />
              </svg>
            </button>

            <button type="button" className={styles.iconBtn} aria-label="Scan QR Code">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3H5a2 2 0 0 0-2 2v2m0 10v2a2 2 0 0 0 2 2h2m10-16h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Destination network</label>
        <div className={styles.networkBadge}>
          <svg className={styles.badgeIcon} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#EF0027" />
            <path d="M8 9.5L24 7.5L20 24.5L16 19L19.5 10L11 13.5L8 9.5Z" fill="white" />
            <path d="M16 19L11.5 24.5L8 9.5L16 19Z" fill="rgba(255,255,255,0.7)" />
          </svg>
          <span>Tron</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#4b5563">
            <polygon points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Amount</label>
        <div className={`${styles.inputBox} ${isAmountFocused ? styles.focused : ""}`}>
          <input
            type="text"
            inputMode="decimal"
            className={styles.inputField}
            placeholder="0.00"
            value={amount}
            onFocus={() => setIsAmountFocused(true)}
            onBlur={() => setIsAmountFocused(false)}
            onChange={(event) => handleAmountInput(event.target.value)}
          />

          <div className={styles.inputActions}>
            <button
              type="button"
              className={`${styles.clearBtn} ${amount ? styles.visible : ""}`}
              aria-label="Clear amount"
              onClick={() => setAmount("")}
            >
              ✕
            </button>
            <span className={styles.currencySuffix}>USDT</span>
            <button type="button" className={styles.actionLink} onClick={() => setAmount("100")}>
              Max
            </button>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.submitBtn} onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
}
