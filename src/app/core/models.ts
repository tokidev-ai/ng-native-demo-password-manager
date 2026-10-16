export interface Vault {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface PasswordEntry {
  id: string;
  vaultId: string;
  title: string;
  website: string;
  username: string;
  /** Plain text in memory. Encrypted before it is written to Firestore. */
  password: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}
