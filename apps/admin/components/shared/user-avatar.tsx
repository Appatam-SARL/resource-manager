import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const initials = `${firstName?.trim().charAt(0) ?? ''}${lastName?.trim().charAt(0) ?? ''}`;
  return initials.toUpperCase() || '?';
}

type UserAvatarProps = {
  firstName?: string | null;
  lastName?: string | null;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
};

export function UserAvatar({ firstName, lastName, size = 'default', className }: UserAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback className="bg-secondary text-xs font-semibold text-primary">
        {getInitials(firstName, lastName)}
      </AvatarFallback>
    </Avatar>
  );
}
