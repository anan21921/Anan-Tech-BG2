import { User, RechargeRequest, RechargeStatus, Transaction, GeneratedImage } from '../types';

const STORAGE_KEY_USERS = 'anan_app_users';
const STORAGE_KEY_CURRENT_USER = 'anan_auth_user';
const STORAGE_KEY_REQUESTS = 'anan_app_recharge_requests';
const STORAGE_KEY_TRANSACTIONS = 'anan_app_transactions';
const STORAGE_KEY_IMAGES = 'anan_app_generated_images';

// Helper for unique IDs
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// Initial Mock Users (only used if storage is empty)
const DEFAULT_USERS: any[] = [
    {
        id: '1',
        username: 'admin',
        password: 'admin',
        name: 'Super Admin',
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff',
        balance: 0 
    },
    {
        id: '2',
        username: 'user',
        password: '1234',
        name: 'Regular User',
        role: 'user',
        avatar: 'https://ui-avatars.com/api/?name=Regular+User&background=6366f1&color=fff',
        balance: 0 
    },
    {
        id: '3',
        username: 'rupok',
        password: '1997',
        name: 'Rupok',
        role: 'user',
        avatar: 'https://ui-avatars.com/api/?name=Rupok&background=10b981&color=fff',
        balance: 0 
    }
];

// Initialize storage
const getStoredUsers = (): any[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_USERS);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
            return DEFAULT_USERS;
        }
        return JSON.parse(stored);
    } catch (e) {
        return DEFAULT_USERS;
    }
};

const getStoredRequests = (): RechargeRequest[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_REQUESTS);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
};

const getStoredTransactions = (): Transaction[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
};

const getStoredImages = (): GeneratedImage[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_IMAGES);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
};

export const login = async (username: string, password: string): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const users = getStoredUsers();
    // Case insensitive username check
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const user = users.find((u: any) => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword);

    if (user) {
        const { password, ...safeUser } = user;
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(safeUser));
        return safeUser;
    }

    return null;
};

export const logout = () => {
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
};

export const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (stored) {
        try {
            const sessionUser = JSON.parse(stored);
            const allUsers = getStoredUsers();
            const freshUser = allUsers.find((u: any) => u.id === sessionUser.id);
            if (freshUser) {
                const { password, ...safeUser } = freshUser;
                return safeUser;
            }
            return sessionUser; 
        } catch (e) {
            return null;
        }
    }
    return null;
};

// --- Database Management (Backup/Restore) ---

export const getFullDatabaseJSON = (): string => {
    const data = {
        users: getStoredUsers(),
        requests: getStoredRequests(),
        transactions: getStoredTransactions(),
        images: getStoredImages(),
        timestamp: new Date().toISOString(),
        version: '1.2'
    };
    return JSON.stringify(data, null, 2);
};

export const restoreDatabaseFromJSON = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (data.users && Array.isArray(data.users)) {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(data.users));
        }
        if (data.requests && Array.isArray(data.requests)) {
            localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(data.requests));
        }
        if (data.transactions && Array.isArray(data.transactions)) {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(data.transactions));
        }
        if (data.images && Array.isArray(data.images)) {
            localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(data.images));
        }
        return true;
    } catch (e) {
        console.error("Failed to restore database", e);
        return false;
    }
};

// --- Admin Functions ---

export const getAllUsers = (): User[] => {
    const users = getStoredUsers();
    return users.map(({ password, ...user }: any) => user);
};

export const createUser = async (userData: { username: string; password: string; name: string; role: 'user' | 'admin', balance?: number }): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const users = getStoredUsers();
    
    const cleanUsername = userData.username.trim();
    
    // Check for duplicate username (case insensitive)
    if (users.find((u: any) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
        throw new Error('এই ইউজারনেমটি ইতিমধ্যে ব্যবহার করা হয়েছে। অন্য ইউজারনেম দিন।');
    }

    // Set default balance to 10 for new users (Welcome Bonus)
    const initialBalance = userData.balance !== undefined ? userData.balance : 10;

    const newUser = {
        id: generateId(),
        ...userData,
        username: cleanUsername,
        password: userData.password.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&color=fff`,
        balance: initialBalance
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    // Log the welcome bonus transaction if applicable
    if (initialBalance > 0) {
        logTransaction({
            userId: newUser.id,
            amount: initialBalance,
            type: 'credit',
            description: 'Welcome Bonus'
        });
    }

    return true;
};

// Helper to log transactions
const logTransaction = (data: { userId: string, amount: number, type: 'credit' | 'debit', description: string }) => {
    const transactions = getStoredTransactions();
    const newTx: Transaction = {
        id: generateId(),
        userId: data.userId,
        amount: Math.abs(data.amount),
        type: data.type,
        description: data.description,
        date: new Date().toISOString()
    };
    transactions.unshift(newTx);
    try {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
        // If storage full, remove old
        if (transactions.length > 100) {
            const trimmed = transactions.slice(0, 100);
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(trimmed));
        }
    }
};

export const updateBalance = async (userId: string, amount: number, description: string = 'System Update'): Promise<User | null> => {
    const users = getStoredUsers();
    const userIndex = users.findIndex((u: any) => u.id === userId);
    
    if (userIndex > -1) {
        const currentBalance = Number(users[userIndex].balance) || 0;
        const newBalance = currentBalance + Number(amount);
        
        users[userIndex].balance = newBalance;
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        
        // Log transaction
        logTransaction({
            userId: userId,
            amount: amount,
            type: amount >= 0 ? 'credit' : 'debit',
            description: description
        });
        
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            const { password, ...safeUser } = users[userIndex];
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(safeUser));
            return safeUser;
        }
        
        const { password, ...safeUser } = users[userIndex];
        return safeUser;
    }
    return null;
};

export const getUserTransactions = (userId: string): Transaction[] => {
    const transactions = getStoredTransactions();
    return transactions.filter(t => t.userId === userId);
};

// --- Recharge Request Functions ---

export const createRechargeRequest = async (data: { userId: string, userName: string, amount: number, senderNumber: string, trxId: string }): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const requests = getStoredRequests();
    
    const newRequest: RechargeRequest = {
        id: generateId(),
        userId: data.userId,
        userName: data.userName,
        amount: Number(data.amount),
        senderNumber: data.senderNumber.trim(),
        trxId: data.trxId.trim(),
        method: 'bkash',
        status: 'pending',
        date: new Date().toISOString()
    };

    requests.unshift(newRequest); 
    try {
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
    } catch (e) {
        // If full, trim old requests
         if (requests.length > 50) {
            localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests.slice(0, 50)));
        }
    }
    return true;
};

export const getRechargeRequests = (): RechargeRequest[] => {
    return getStoredRequests();
};

export const getUserRechargeRequests = (userId: string): RechargeRequest[] => {
    const requests = getStoredRequests();
    return requests.filter(r => r.userId === userId);
};

export const handleRechargeRequest = async (requestId: string, status: 'approved' | 'rejected'): Promise<boolean> => {
    const requests = getStoredRequests();
    const index = requests.findIndex(r => r.id === requestId);
    
    if (index > -1 && requests[index].status === 'pending') {
        if (status === 'approved') {
            const userId = requests[index].userId;
            const amount = requests[index].amount;
            const updatedUser = await updateBalance(userId, amount, `Recharge Approved (Trx: ${requests[index].trxId})`);
            if (!updatedUser) return false;
        }
        requests[index].status = status;
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
        return true;
    }
    return false;
};

// --- Image Gallery Functions ---

export const saveGeneratedImage = (data: { userId: string, userName: string, imageBase64: string, settings: string }): boolean => {
    const images = getStoredImages();
    const newImage: GeneratedImage = {
        id: generateId(),
        userId: data.userId,
        userName: data.userName,
        imageBase64: data.imageBase64,
        date: new Date().toISOString(),
        settings: data.settings
    };
    
    images.unshift(newImage);

    // Storage Management: localStorage limit is usually 5-10MB.
    // If we exceed quota, remove oldest images.
    try {
        localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            // Remove last 5 images and try again
            if (images.length > 5) {
                const trimmedImages = images.slice(0, images.length - 5);
                try {
                     localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(trimmedImages));
                     return true;
                } catch(retryErr) {
                    // Critical fail
                    return false;
                }
            }
        }
        return false;
    }
    return true;
};

export const getAllGeneratedImages = (): GeneratedImage[] => {
    return getStoredImages();
};

export const getUserGeneratedImages = (userId: string): GeneratedImage[] => {
    const images = getStoredImages();
    return images.filter(img => img.userId === userId);
};