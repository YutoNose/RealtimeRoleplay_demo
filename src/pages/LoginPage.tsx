import type React from 'react';
import { useState } from 'react';
import './LoginPage.scss';
import { supabase } from '../lib/supabase/supabaseclient';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
      });
      if (error) {
        setError('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。');
        console.error('ログインエラー:', error.message);
      } else {
        console.log('ログインに成功しました');
        window.location.href = '/'; // ログイン成功時にダームに遷移します
      }
    } catch (error) {
      setError('予期しないエラーが発生しました。');
      console.error('予期しないエラー:', error);
    }
  };

  return (
    <div className="login-page">
      <h1>ログイン</h1>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">メールアドレス</label>
          <input
            type="text"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="pass">パスワード</label>
          <input
            type="password"
            id="pass"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit">ログイン</button>
      </form>
    </div>
  );
}