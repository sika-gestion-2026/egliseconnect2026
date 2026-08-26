export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  quartier?: string;
  birth_date?: string;
  photo_url?: string;
  created_at: string;
  user_profiles?: { role: string }[];
}

export interface BirthdayMember extends Member {
  ageTurning?: number;
  day?: number;
}

export function calculateBirthdays(members: Member[]) {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentDate = today.getDate();

  const todaysBirthdays: BirthdayMember[] = [];
  const monthsBirthdays: BirthdayMember[] = [];

  members.forEach(m => {
    if (m.birth_date) {
      // bDate est au format YYYY-MM-DD
      const parts = m.birth_date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        const ageTurning = today.getFullYear() - year;

        if (month === currentMonth && day === currentDate) {
          todaysBirthdays.push({ ...m, ageTurning });
        } else if (month === currentMonth) {
          monthsBirthdays.push({ ...m, day });
        }
      }
    }
  });

  return { todaysBirthdays, monthsBirthdays };
}

export function calculateAbsentees(members: Member[], presentIds: string[]) {
  return members.filter(m => !presentIds.includes(m.id));
}
