import React from 'react';

// Definition av Draggable-komponenten som används i KanbanBoard
// Detta är en temporär lösning för att få appen att fungera
export const Draggable: React.FC<{
  children: React.ReactNode;
  id?: string;
  [key: string]: any;
}> = ({ children, ...props }) => {
  return <>{children}</>;
};