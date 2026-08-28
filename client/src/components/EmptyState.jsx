import React from 'react';

const EmptyState = ({ icon = 'inbox', title, description, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-700 mb-2">{title || 'Nothing here yet'}</h3>
    {description && <p className="text-sm text-gray-500 max-w-md mb-6">{description}</p>}
    {action && actionLabel && (
      <button
        onClick={action}
        className="px-6 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;