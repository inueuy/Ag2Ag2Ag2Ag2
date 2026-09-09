import React, { useState } from 'react';
import { User } from '../types';
import { locaDB } from '../services/locadb';
import { X, Lock, Mail, AlertCircle, CheckCircle2, LogIn, Zap } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (user: User) => void;
}

interface TestAccount {
  id: string;
  pw: string;
  nickname: string;
  roleLabel: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    id: 'test01@mail.com',
    pw: '123456',
    nickname: '은이바라기',
    roleLabel: '일반회원',
  },
  {
    id: 'test02@mail.com',
    pw: '123456',
    nickname: '햇살은이',
    roleLabel: '일반회원',
  },
  {
    id: 'test03@mail.com',
    pw: '123456',
    nickname: '은이누나팬',
    roleLabel: '일반회원',
  },
  {
    id: 'admin',
    pw: 'password123',
    nickname: '카페지기',
    roleLabel: '관리자',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-login handler for test IDs
  const handleAutoLogin = (targetUsername: string) => {
    setError(null);
    setSuccessMsg(null);

    const user = locaDB.findUserByUsername(targetUsername);
    if (!user) {
      setError(`테스트 계정(${targetUsername}) 정보를 찾을 수 없습니다.`);
      return;
    }

    if (user.status === 'suspended') {
      setError('관리자에 의해 이용이 정지된 계정입니다.');
      return;
    }

    locaDB.setCurrentUser(user);
    setSuccessMsg(`'${user.nickname}' 님으로 자동 로그인되었습니다.`);
    setTimeout(() => {
      onSuccess(user);
      onClose();
    }, 250);
  };

  const handleQuickFill = (accUsername: string, accPass: string) => {
    setUsername(accUsername);
    setPassword(accPass);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      if (!username.trim() || !password) {
        setError('아이디와 비밀번호를 모두 입력해 주세요.');
        return;
      }

      const user = locaDB.findUserByUsername(username);
      if (!user) {
        setError('가입되지 않은 아이디입니다.');
        return;
      }

      if (user.status === 'suspended') {
        setError('관리자에 의해 이용이 정지된 계정입니다.');
        return;
      }

      if (user.password && user.password !== password) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }

      locaDB.setCurrentUser(user);
      onSuccess(user);
      onClose();
    } else {
      // Sign up validation
      if (!username.trim() || !password || !nickname.trim() || !email.trim()) {
        setError('모든 필수 정보를 입력해 주세요.');
        return;
      }

      if (username.length < 3) {
        setError('아이디는 3자 이상이어야 합니다.');
        return;
      }

      if (password.length < 4) {
        setError('비밀번호는 4자 이상이어야 합니다.');
        return;
      }

      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }

      const result = locaDB.createUser({
        username,
        password,
        nickname,
        email,
        role: 'user',
      });

      if (!result.success || !result.user) {
        setError(result.message || '회원가입에 실패했습니다.');
        return;
      }

      setSuccessMsg('회원가입이 완료되었습니다! 로그인 상태로 전환됩니다.');
      locaDB.setCurrentUser(result.user);
      setTimeout(() => {
        onSuccess(result.user!);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/40 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#ececed] rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f4f5] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#315643]"></span>
            <h3 className="text-base font-bold text-[#18181b]">
              {mode === 'login' ? '로그인' : '회원가입'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#71717a] hover:text-[#18181b] border border-[#e8e8ea] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1.5 mx-6 mt-4 bg-[#f4f4f5] rounded-xl border border-[#ececed] shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all border ${
              mode === 'login'
                ? 'bg-[#ffffff] text-[#18181b] shadow-2xs border-[#f0f0f1]'
                : 'bg-transparent text-[#71717a] border-transparent hover:text-[#18181b]'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all border ${
              mode === 'signup'
                ? 'bg-[#ffffff] text-[#18181b] shadow-2xs border-[#f0f0f1]'
                : 'bg-transparent text-[#71717a] border-transparent hover:text-[#18181b]'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-[#fdf2f2] border border-[#fae2e2] text-[#9c3a3a]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-[#edf5f0] border border-[#e0ece4] text-[#2c5340]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Test Account Auto-Login Section */}
          {mode === 'login' && (
            <div className="space-y-2 p-3.5 bg-[#fafafa] border border-[#f0f0f1] rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#18181b] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#315643]" />
                  테스트 아이디 자동로그인
                </span>
                <span className="text-[10px] text-[#71717a]">클릭 시 즉시 로그인</span>
              </div>

              <div className="space-y-1.5 pt-0.5">
                {TEST_ACCOUNTS.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#ffffff] border border-[#ececed] hover:border-[#dcdce0] transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4] flex items-center justify-center text-xs font-bold shrink-0">
                        {acc.nickname.slice(0, 1)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#18181b] truncate">
                            {acc.nickname}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[10px] font-medium rounded ${
                              acc.roleLabel === '관리자'
                                ? 'bg-[#18181b] text-white'
                                : 'bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]'
                            }`}
                          >
                            {acc.roleLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#71717a] font-mono truncate">
                          {acc.id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuickFill(acc.id, acc.pw)}
                        title="입력 폼에 채우기"
                        className="px-2 py-1 text-[11px] font-medium rounded-lg bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#52525b] border border-[#e8e8ea] transition-colors"
                      >
                        입력
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoLogin(acc.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2c5340] border border-[#e0ece4] transition-colors flex items-center gap-1"
                      >
                        <LogIn className="w-3 h-3" />
                        자동로그인
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#f0f0f1]"></div>
              <span className="shrink-0 px-2 text-[11px] text-[#a1a1aa]">또는 직접 아이디 입력</span>
              <div className="flex-grow border-t border-[#f0f0f1]"></div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#52525b]">
              아이디
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디(이메일)를 입력하세요"
                className="w-full px-3 py-2 text-sm bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#52525b]">
                  닉네임
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="게시판에 표시될 닉네임"
                  className="w-full px-3 py-2 text-sm bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#52525b]">
                  이메일
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="w-full px-3 py-2 text-sm bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
                    required
                  />
                  <Mail className="w-4 h-4 text-[#a1a1aa] absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#52525b]">
              비밀번호
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full px-3 py-2 text-sm bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
                required
              />
              <Lock className="w-4 h-4 text-[#a1a1aa] absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#52525b]">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력하세요"
                className="w-full px-3 py-2 text-sm bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
                required
              />
            </div>
          )}

          {/* Tone-on-tone button styling */}
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold rounded-xl bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2c5340] border border-[#e0ece4] transition-colors mt-2"
          >
            {mode === 'login' ? '로그인하기' : '회원가입 완료'}
          </button>
        </form>
      </div>
    </div>
  );
};
