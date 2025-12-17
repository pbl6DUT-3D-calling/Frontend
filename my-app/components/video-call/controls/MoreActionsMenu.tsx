'use client';

import React from 'react';
import { MoreVertical, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MoreActionsMenu() {
  const handleOpenSettings = () => {
    console.log('Open settings');
    // TODO: Open settings modal
  };

  const handleViewParticipants = () => {
    console.log('View participants');
    // TODO: Open participants panel
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="default"
          size="icon"
          className="rounded-full w-10 h-10"
          title="More Actions"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleViewParticipants} className="cursor-pointer">
          <Users className="w-4 h-4 mr-2" />
          Participants
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleOpenSettings} className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}