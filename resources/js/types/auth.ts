export type User = {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    telephone?: string;
    status?: string;
    role: 'admin' | 'teacher' | 'superadmin';
    centerId?: number | null;
    centerSlug?: string | null;
    centerName?: string | null;
    teaches?: { roomId?: string; subject?: string; coefficient?: number }[];
    [key: string]: any;
};

export type Auth = {
    user: User;
};
