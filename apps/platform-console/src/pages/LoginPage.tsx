import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  completePasswordReset,
  completeRegister,
  login,
  sendPasswordResetCode,
  sendRegisterCode
} from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';

type AuthMode = 'login' | 'register' | 'reset_password';

const highlights = [
  {
    title: '登录使用密码',
    description: '已有账号直接输入邮箱和密码登录，这是平台的标准入口。'
  },
  {
    title: '注册先验证邮箱',
    description: '新账号必须先收验证码验证邮箱，再设置密码完成注册。'
  },
  {
    title: '设备授权同一套账号',
    description: '远程访问、设备列表和后续 token 能力都统一依赖同一个 NextClaw Account。'
  }
] as const;

const modeMeta: Record<AuthMode, { label: string; title: string; subtitle: string }> = {
  login: {
    label: '登录',
    title: '邮箱 + 密码登录',
    subtitle: '已有 NextClaw Account 直接用密码登录。注册和找回密码在旁边两个入口。'
  },
  register: {
    label: '注册',
    title: '先验证邮箱，再设置密码',
    subtitle: '新账号必须先通过邮箱验证码验证归属，再设置密码完成注册。'
  },
  reset_password: {
    label: '忘记密码',
    title: '验证码验证后重置密码',
    subtitle: '我们会先验证邮箱归属，确认后允许设置新密码。'
  }
};

type CodeFlowState = {
  mode: 'register' | 'reset_password';
  email: string;
  maskedEmail: string;
  expiresAt: string;
  debugCode: string | null;
};

function LoginHighlights(): JSX.Element {
  return (
    <section className="flex items-center">
      <div className="w-full rounded-[32px] border border-white/60 bg-white/70 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur md:p-10">
        <div className="max-w-xl space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-700">NextClaw Platform</p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
              一个 NextClaw Account，连接你的设备和 Agent 工作流。
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-600 md:text-lg">
              这是 NextClaw 的统一账号入口。平台登录、设备授权、远程访问和未来账号能力，都基于同一套账号模型。
            </p>
          </div>

          <div className="grid gap-4">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/90 px-5 py-4"
              >
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type AuthCardProps = {
  mode: AuthMode;
  email: string;
  password: string;
  code: string;
  codeFlow: CodeFlowState | null;
  error: string | null;
  loginPending: boolean;
  sendCodePending: boolean;
  completePending: boolean;
  canLogin: boolean;
  canSendCode: boolean;
  canComplete: boolean;
  onModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onLogin: () => void;
  onSendCode: () => void;
  onComplete: () => void;
  onResetCodeFlow: () => void;
};

function AuthModeTabs(props: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-1">
      {(Object.keys(modeMeta) as AuthMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => props.onModeChange(mode)}
          className={[
            'rounded-[20px] px-3 py-2 text-sm font-semibold transition',
            props.mode === mode ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'
          ].join(' ')}
        >
          {modeMeta[mode].label}
        </button>
      ))}
    </div>
  );
}

function CodeFlowNotice(props: {
  codeFlow: CodeFlowState;
  expiresAtText: string;
}): JSX.Element {
  return (
    <div className="rounded-3xl border border-brand-100 bg-brand-50/70 px-4 py-4">
      <p className="text-sm font-medium text-slate-900">
        验证码已发送至 {props.codeFlow.maskedEmail || props.codeFlow.email}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">当前验证码过期时间：{props.expiresAtText || '-'}。</p>
      {props.codeFlow.debugCode ? (
        <p className="mt-3 rounded-2xl border border-dashed border-brand-300 bg-white px-3 py-2 text-sm text-brand-700">
          Dev code: <span className="font-semibold tracking-[0.22em]">{props.codeFlow.debugCode}</span>
        </p>
      ) : null}
    </div>
  );
}

function AuthActionBlock(props: {
  mode: AuthMode;
  codeStepActive: boolean;
  loginPending: boolean;
  sendCodePending: boolean;
  completePending: boolean;
  canLogin: boolean;
  canSendCode: boolean;
  canComplete: boolean;
  onLogin: () => void;
  onSendCode: () => void;
  onComplete: () => void;
  onResetCodeFlow: () => void;
}): JSX.Element {
  if (props.mode === 'login') {
    return (
      <Button
        className="h-12 w-full rounded-2xl text-[15px]"
        onClick={props.onLogin}
        disabled={!props.canLogin}
      >
        {props.loginPending ? '登录中...' : '登录'}
      </Button>
    );
  }

  if (!props.codeStepActive) {
    return (
      <Button
        className="h-12 w-full rounded-2xl text-[15px]"
        onClick={props.onSendCode}
        disabled={!props.canSendCode}
      >
        {props.sendCodePending ? '发送中...' : '发送验证码'}
      </Button>
    );
  }

  return (
    <>
      <Button
        className="h-12 w-full rounded-2xl text-[15px]"
        onClick={props.onComplete}
        disabled={!props.canComplete}
      >
        {props.completePending
          ? props.mode === 'register'
            ? '注册中...'
            : '重置中...'
          : props.mode === 'register'
            ? '完成注册'
            : '重置密码'}
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          className="h-11 rounded-2xl"
          onClick={props.onSendCode}
          disabled={props.sendCodePending}
        >
          {props.sendCodePending ? '发送中...' : '重新发送'}
        </Button>
        <Button
          variant="ghost"
          className="h-11 rounded-2xl border border-slate-200"
          onClick={props.onResetCodeFlow}
        >
          更换邮箱
        </Button>
      </div>
    </>
  );
}

function LoginAuthCard(props: AuthCardProps): JSX.Element {
  const currentMeta = modeMeta[props.mode];
  const codeStepActive = props.codeFlow?.mode === props.mode;
  const expiresAtText = useMemo(() => {
    if (!props.codeFlow?.expiresAt) {
      return '';
    }
    return new Date(props.codeFlow.expiresAt).toLocaleString();
  }, [props.codeFlow]);

  return (
    <section className="flex items-center">
      <Card className="w-full rounded-[32px] border-slate-200/80 bg-white/92 p-7 shadow-[0_24px_72px_rgba(15,23,42,0.12)] md:p-8">
        <div className="space-y-4">
          <AuthModeTabs mode={props.mode} onModeChange={props.onModeChange} />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">NextClaw Account</p>
            <CardTitle className="text-[28px] leading-tight tracking-[-0.03em]">{currentMeta.title}</CardTitle>
            <p className="text-sm leading-6 text-slate-500">{currentMeta.subtitle}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              邮箱
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={props.email}
              onChange={(event) => props.onEmailChange(event.target.value)}
              disabled={Boolean(codeStepActive)}
              className="h-12 rounded-2xl px-4 text-[15px]"
            />
          </div>

          {props.mode === 'login' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                密码
              </label>
              <Input
                id="password"
                type="password"
                placeholder="请输入你的密码"
                value={props.password}
                onChange={(event) => props.onPasswordChange(event.target.value)}
                className="h-12 rounded-2xl px-4 text-[15px]"
              />
            </div>
          ) : null}

          {props.mode !== 'login' && codeStepActive && props.codeFlow ? (
            <CodeFlowNotice codeFlow={props.codeFlow} expiresAtText={expiresAtText} />
          ) : null}

          {props.mode !== 'login' && codeStepActive ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="code">
                  验证码
                </label>
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="123456"
                  value={props.code}
                  onChange={(event) => props.onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 rounded-2xl px-4 text-[18px] tracking-[0.28em]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="password-action">
                  {props.mode === 'register' ? '设置密码' : '新密码'}
                </label>
                <Input
                  id="password-action"
                  type="password"
                  placeholder="至少 8 位"
                  value={props.password}
                  onChange={(event) => props.onPasswordChange(event.target.value)}
                  className="h-12 rounded-2xl px-4 text-[15px]"
                />
              </div>
            </>
          ) : null}
        </div>

        {props.error ? <p className="mt-4 text-sm text-rose-600">{props.error}</p> : null}

        <div className="mt-6 space-y-3">
          <AuthActionBlock
            mode={props.mode}
            codeStepActive={Boolean(codeStepActive)}
            loginPending={props.loginPending}
            sendCodePending={props.sendCodePending}
            completePending={props.completePending}
            canLogin={props.canLogin}
            canSendCode={props.canSendCode}
            canComplete={props.canComplete}
            onLogin={props.onLogin}
            onSendCode={props.onSendCode}
            onComplete={props.onComplete}
            onResetCodeFlow={props.onResetCodeFlow}
          />
        </div>
      </Card>
    </section>
  );
}

export function LoginPage(): JSX.Element {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeFlow, setCodeFlow] = useState<CodeFlowState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  const loginMutation = useMutation({
    mutationFn: async () => await login(email, password),
    onSuccess: (result) => {
      setToken(result.token);
      setUser(result.user);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  });

  const sendRegisterCodeMutation = useMutation({
    mutationFn: async () => await sendRegisterCode(email),
    onSuccess: (result) => {
      setEmail(result.email);
      setCodeFlow({
        mode: 'register',
        email: result.email,
        maskedEmail: result.maskedEmail,
        expiresAt: result.expiresAt,
        debugCode: result.debugCode ?? null
      });
      setCode('');
      setPassword('');
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '发送注册验证码失败');
    }
  });

  const completeRegisterMutation = useMutation({
    mutationFn: async () => await completeRegister(codeFlow?.email ?? email, code, password),
    onSuccess: (result) => {
      setToken(result.token);
      setUser(result.user);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '注册失败');
    }
  });

  const sendResetCodeMutation = useMutation({
    mutationFn: async () => await sendPasswordResetCode(email),
    onSuccess: (result) => {
      setEmail(result.email);
      setCodeFlow({
        mode: 'reset_password',
        email: result.email,
        maskedEmail: result.maskedEmail,
        expiresAt: result.expiresAt,
        debugCode: result.debugCode ?? null
      });
      setCode('');
      setPassword('');
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '发送重置验证码失败');
    }
  });

  const completeResetMutation = useMutation({
    mutationFn: async () => await completePasswordReset(codeFlow?.email ?? email, code, password),
    onSuccess: (result) => {
      setToken(result.token);
      setUser(result.user);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '重置密码失败');
    }
  });

  useEffect(() => {
    setError(null);
    setPassword('');
    setCode('');
    if (codeFlow?.mode !== mode) {
      setCodeFlow(null);
    }
  }, [mode]);

  const codeStepActive = codeFlow?.mode === mode;
  const canLogin = email.trim().length > 0 && password.length > 0 && !loginMutation.isPending;
  const canSendCode = email.trim().length > 0
    && mode !== 'login'
    && !(mode === 'register' ? sendRegisterCodeMutation.isPending : sendResetCodeMutation.isPending);
  const canComplete = Boolean(codeStepActive)
    && /^\d{6}$/.test(code.trim())
    && password.trim().length >= 8
    && !(mode === 'register' ? completeRegisterMutation.isPending : completeResetMutation.isPending);

  return (
    <main className="min-h-screen bg-transparent text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
        <LoginHighlights />
        <LoginAuthCard
          mode={mode}
          email={email}
          password={password}
          code={code}
          codeFlow={codeFlow}
          error={error}
          loginPending={loginMutation.isPending}
          sendCodePending={mode === 'register' ? sendRegisterCodeMutation.isPending : sendResetCodeMutation.isPending}
          completePending={mode === 'register' ? completeRegisterMutation.isPending : completeResetMutation.isPending}
          canLogin={canLogin}
          canSendCode={canSendCode}
          canComplete={canComplete}
          onModeChange={(nextMode) => setMode(nextMode)}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onCodeChange={setCode}
          onLogin={() => loginMutation.mutate()}
          onSendCode={() => {
            if (mode === 'register') {
              sendRegisterCodeMutation.mutate();
              return;
            }
            sendResetCodeMutation.mutate();
          }}
          onComplete={() => {
            if (mode === 'register') {
              completeRegisterMutation.mutate();
              return;
            }
            completeResetMutation.mutate();
          }}
          onResetCodeFlow={() => {
            setCodeFlow(null);
            setCode('');
            setPassword('');
            setError(null);
          }}
        />
      </div>
    </main>
  );
}
