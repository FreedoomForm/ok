'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface User {
    id: string
    name: string
    color: string
    online: boolean
}

interface UserListProps {
    users: User[]
    maxVisible?: number
}

export function UserList({ users, maxVisible = 5 }: UserListProps) {
    const visibleUsers = users.slice(0, maxVisible)
    const remainingCount = users.length - maxVisible

    if (users.length === 0) return null

    return (
        <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
                {visibleUsers.map((user) => (
                    <TooltipProvider key={user.id} delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger>
                                <Avatar
                                    className="w-8 h-8 border-2 border-background"
                                    style={{ backgroundColor: user.color }}
                                >
                                    <AvatarFallback
                                        className="text-xs text-white font-medium"
                                        style={{ backgroundColor: user.color }}
                                    >
                                        {user.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{user.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}

                {remainingCount > 0 && (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger>
                                <Avatar className="w-8 h-8 border-2 border-background bg-muted">
                                    <AvatarFallback className="text-xs">
                                        +{remainingCount}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{remainingCount} more online</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            <span className="text-xs text-muted-foreground ml-2">
                {users.length} online
            </span>
        </div>
    )
}
