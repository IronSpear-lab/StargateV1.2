import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

interface UserProfile {
  displayName: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  jobTitle: string;
  department: string;
  bio: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    phoneNumber: '',
    birthDate: '',
    jobTitle: '',
    department: '',
    bio: ''
  });

  // Ladda avatarbild från localStorage när komponenten monteras
  useEffect(() => {
    if (user?.username) {
      // Försök hämta avataren från localStorage
      const savedAvatar = localStorage.getItem(`userAvatar_${user.username}`);
      if (savedAvatar) {
        setUserAvatar(savedAvatar);
      }
      
      // Ladda profilinformation från localStorage
      const userPrefix = `${user.username}_`;
      setUserProfile({
        displayName: localStorage.getItem(`${userPrefix}displayName`) || '',
        email: localStorage.getItem(`${userPrefix}email`) || '',
        phoneNumber: localStorage.getItem(`${userPrefix}phoneNumber`) || '',
        birthDate: localStorage.getItem(`${userPrefix}birthDate`) || '',
        jobTitle: localStorage.getItem(`${userPrefix}jobTitle`) || '',
        department: localStorage.getItem(`${userPrefix}department`) || '',
        bio: localStorage.getItem(`${userPrefix}bio`) || ''
      });
    }
  }, [user?.username]);

  return { userAvatar, setUserAvatar, userProfile, setUserProfile };
}