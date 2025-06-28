
import React from 'react';
import { Outlet } from 'react-router-dom';
import MainHeader from './MainHeader';
import Sidebar from './Sidebar';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MainHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
