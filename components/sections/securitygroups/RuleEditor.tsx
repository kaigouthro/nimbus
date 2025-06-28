
import React from 'react';
import { SecurityGroupRule } from '../../../types';
import Button from '../../common/Button';
import { ArrowRightLeft, Download, Upload, Trash2, Globe } from 'lucide-react'; // Using Globe for remote IP

interface RuleEditorProps {
  rules: SecurityGroupRule[];
  onDeleteRule: (ruleId: string) => void;
  // onAddRule: (rule: Omit<SecurityGroupRule, 'id'>) => void; // If add form is part of this component
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rules, onDeleteRule }) => {
  const formatPortRange = (min?: number | null, max?: number | null) => {
    if (min === null || min === undefined) return 'Any';
    if (max === null || max === undefined || min === max) return min.toString();
    return `${min} - ${max}`;
  };

  const getRemoteSource = (rule: SecurityGroupRule) => {
    if (rule.remoteIpPrefix) return rule.remoteIpPrefix;
    if (rule.remoteGroupId) return `Group: ${rule.remoteGroupId}`; // In a real app, fetch group name
    return 'Any';
  };

  if (rules.length === 0) {
    return <p className="text-slate-400 text-center py-6">No rules defined for this group. Add a rule to get started.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700/50">
          <tr>
            {['Direction', 'Protocol', 'Port Range', 'Remote Source', 'Ethertype', 'Actions'].map(header => (
              <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {rules.map(rule => (
            <tr key={rule.id} className="hover:bg-slate-700/30 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-200">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rule.direction === 'ingress' ? 'bg-blue-600 text-blue-100' : 'bg-green-600 text-green-100'
                }`}>
                  {rule.direction === 'ingress' ? <Download size={12} className="mr-1" /> : <Upload size={12} className="mr-1" />}
                  {rule.direction.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 uppercase">{rule.protocol || 'Any'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{formatPortRange(rule.portRangeMin, rule.portRangeMax)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 flex items-center">
                <Globe size={14} className="mr-1.5 text-slate-500" /> {getRemoteSource(rule)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{rule.ethertype}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <Button onClick={() => onDeleteRule(rule.id)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                  <Trash2 size={16} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RuleEditor;
