import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Role, DeviceConfig } from '../types';
import toast from 'react-hot-toast';
import { Factory, User as UserIcon, Lock, Tablet, Settings } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState<Role>('PROGRAMADOR');
  const [password, setPassword] = useState('');
  const [machine, setMachine] = useState('MAQUINA 1');
  const [showConfig, setShowConfig] = useState(false);
  const [bindMachine, setBindMachine] = useState('MAQUINA 1');
  const [bindType, setBindType] = useState<'PROGRAMADOR' | 'MAQUINA'>('MAQUINA');
  
  const login = useStore(state => state.login);
  const deviceConfig = useStore(state => state.deviceConfig);
  const bindDevice = useStore(state => state.bindDevice);
  const unbindDevice = useStore(state => state.unbindDevice);
  const navigate = useNavigate();

  useEffect(() => {
    if (deviceConfig?.isBound) {
      if (deviceConfig.type === 'MAQUINA') {
        login({ role: 'OPERADOR', machine: deviceConfig.machineId });
        navigate('/operador');
      } else if (deviceConfig.type === 'PROGRAMADOR') {
        login({ role: 'PROGRAMADOR' });
        navigate('/programador');
      }
    }
  }, [deviceConfig, login, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'PROGRAMADOR' || role === 'ESTOQUE' || role === 'ESCRITORIO' || role === 'FINANCEIRO') {
      if (password === '1015') {
        login({ role });
        navigate('/');
      } else {
        toast.error('Senha incorreta');
      }
    } else if (role === 'OPERADOR') {
      const validPasswords: Record<string, string> = {
        'MAQUINA 1': '0101',
        'MAQUINA 2': '0202',
        'MAQUINA 3': '0303',
        'MAQUINA 4': '0404',
      };
      if (password === validPasswords[machine]) {
        login({ role, machine });
        navigate('/');
      } else {
        toast.error('Senha incorreta para esta máquina');
      }
    }
  };

  const handleBind = () => {
    if (password === '1015') {
      bindDevice({
        type: bindType,
        machineId: bindType === 'MAQUINA' ? bindMachine : undefined,
        isBound: true
      });
      toast.success('Dispositivo vinculado com sucesso!');
      setShowConfig(false);
      setPassword('');
    } else {
      toast.error('Senha administrativa incorreta');
    }
  };

  if (showConfig) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Vincular Dispositivo</h1>
            <p className="text-neutral-400 mt-2">Configurar tablet fixo</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Tipo de Tablet</label>
              <select
                value={bindType}
                onChange={(e) => setBindType(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="MAQUINA">Tablet de Máquina</option>
                <option value="PROGRAMADOR">Tablet do Programador</option>
              </select>
            </div>

            {bindType === 'MAQUINA' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Máquina Vinculada</label>
                <select
                  value={bindMachine}
                  onChange={(e) => setBindMachine(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="MAQUINA 1">Máquina 1</option>
                  <option value="MAQUINA 2">Máquina 2</option>
                  <option value="MAQUINA 3">Máquina 3</option>
                  <option value="MAQUINA 4">Máquina 4</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Senha Admin</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Digite a senha admin"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBind}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Salvar Vínculo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Texlog</h1>
          <p className="text-neutral-400 mt-2">Logística Têxtil</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* ... existing form fields ... */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Perfil de Acesso</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="PROGRAMADOR">Programador</option>
                <option value="OPERADOR">Operador</option>
                <option value="ESCRITORIO">Escritório</option>
                <option value="ESTOQUE">Estoque</option>
                <option value="FINANCEIRO">Financeiro</option>
              </select>
            </div>
          </div>

          {role === 'OPERADOR' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Máquina</label>
              <select
                value={machine}
                onChange={(e) => setMachine(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="MAQUINA 1">Máquina 1</option>
                <option value="MAQUINA 2">Máquina 2</option>
                <option value="MAQUINA 3">Máquina 3</option>
                <option value="MAQUINA 4">Máquina 4</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 shadow-lg shadow-blue-500/20"
          >
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-neutral-800">
          <button
            onClick={() => setShowConfig(true)}
            className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-amber-500 transition-colors text-sm font-medium"
          >
            <Tablet className="w-4 h-4" />
            Configurar este tablet
          </button>
        </div>
      </div>
    </div>
  );
}
