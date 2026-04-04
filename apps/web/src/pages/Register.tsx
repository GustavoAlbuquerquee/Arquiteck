import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const PRIMOR_MOVEIS_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validações
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, PRIMOR_MOVEIS_TENANT_ID);

    if (error) {
      setError(error.message || 'Erro ao criar conta');
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Auto-login: redirecionar direto para o Dashboard
      setTimeout(() => {
        navigate('/');
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Arquiteck</h1>
          <p className="text-gray-600">Criar nova conta</p>
        </div>

        {/* Card de Registro */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Criar sua conta
          </h2>

          {/* Alerta de Erro */}
          {error && (
            <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Alerta de Sucesso */}
          {success && (
            <div className="mb-4 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-700 text-sm font-semibold">Conta criada com sucesso!</p>
                <p className="text-green-600 text-xs mt-1">Redirecionando para o sistema...</p>
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
                  placeholder="seu@email.com"
                  required
                  disabled={loading || success}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
                  placeholder="••••••••"
                  required
                  disabled={loading || success}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
                  placeholder="••••••••"
                  required
                  disabled={loading || success}
                />
              </div>
            </div>

            {/* Info sobre Tenant */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>Empresa:</strong> Primor Móveis
              </p>
            </div>

            {/* Botão de Registro */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full h-12 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Criando conta...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Conta criada!
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Criar conta
                </>
              )}
            </button>
          </form>

          {/* Link para Login */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold">
                Fazer login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2024 Arquiteck. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
