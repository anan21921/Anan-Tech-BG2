import { User, RechargeRequest, RechargeStatus } from '../types';

const STORAGE_KEY_USERS = 'anan_app_users';
const STORAGE_KEY_CURRENT_USER = 'anan_auth_user';
const STORAGE_KEY_REQUESTS = 'anan_app_recharge_requests';

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
        balance: 1000
    },
    {
        id: '2',
        username: 'user',
        password: '1234',
        name: 'Regular User',
        role: 'user',
        avatar: 'https://ui-avatars.com/api/?name=Regular+User&background=6366f1&color=fff',
        balance: 10
    },
    {
        id: '3',
        username: 'rupok',
        password: '1997',
        name: 'Rupok',
        role: 'user',
        avatar: 'https://ui-avatars.com/api/?name=Rupok&background=10b981&color=fff',
        balance: 100
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
        timestamp: new Date().toISOString(),
        version: '1.0'
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

export const createUser = async (userData: { username: string; password: string; name: string; role: 'user' | 'admin', balance: number }): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const users = getStoredUsers();
    
    const cleanUsername = userData.username.trim();
    
    // Check for duplicate username (case insensitive)
    if (users.find((u: any) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
        throw new Error('এই ইউজারনেমটি ইতিমধ্যে ব্যবহার করা হয়েছে। অন্য ইউজারনেম দিন।');
    }

    const newUser = {
        id: generateId(),
        ...userData,
        username: cleanUsername,
        password: userData.password.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&color=fff`
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    return true;
};

export const updateBalance = async (userId: string, amount: number): Promise<User | null> => {
    const users = getStoredUsers();
    const userIndex = users.findIndex((u: any) => u.id === userId);
    
    if (userIndex > -1) {
        const currentBalance = Number(users[userIndex].balance) || 0;
        users[userIndex].balance = currentBalance + Number(amount);
        
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        
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
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
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
    // 1. Get latest requests
    const requests = getStoredRequests();
    const index = requests.findIndex(r => r.id === requestId);
    
    if (index > -1 && requests[index].status === 'pending') {
        
        // 2. If approving, FIRST try to update the balance
        if (status === 'approved') {
            const userId = requests[index].userId;
            const amount = requests[index].amount;
            
            // This function handles fetching users, updating, and saving users to storage
            const updatedUser = await updateBalance(userId, amount);
            
            if (!updatedUser) {
                console.error("User not found for balance update, cannot approve request.");
                return false;
            }
        }
        
        // 3. Only if balance updated (or if rejecting), update request status
        requests[index].status = status;
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
        return true;
    }
    return false;
};