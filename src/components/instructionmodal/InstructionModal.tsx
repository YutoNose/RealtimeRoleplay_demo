import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/supabaseclient';
import toast from 'react-hot-toast';
import './InstructionModal.scss';

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  instruction: string | null;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({
  isOpen,
  onClose,
  instruction,
}) => {
  const [editInstruction, setEditInstruction] = useState(instruction);

  // instructionが変更されたときにeditInstructionを更新します
  useEffect(() => {
    setEditInstruction(instruction);
  }, [instruction]);

  console.log('instruction', instruction);

  const handleSave = async () => {
    const { data: userSession, error: userError } = await supabase.auth.getUser();
    if (userError || !userSession) {
      console.error('User not logged in:', userError?.message);
      toast.error('ログインしていません。');
      return;
    }

    console.log('editInstruction', editInstruction);
    const userId = userSession.user.id;
    const { data, error } = await supabase
      .from('instructions')
      .update({ instruction: editInstruction })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating instruction:', error.message);
      toast.error('指示の更新中にエラーが発生しました。');
    } else {
      console.log('Instruction updated successfully');
      toast.success('指示が正常に更新されました。');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} type="button" style={{ position: 'absolute', top: '10px', right: '10px' }}>
          ×
        </button>
        <h2 className="modal-title">User Instruction (プロンプト)</h2>
        <textarea
          className="modal-instruction"
          value={editInstruction || ''}
          onChange={(e) => setEditInstruction(e.target.value)}
          rows={10}
        />
        <button className="modal-save" onClick={handleSave} type="button">
          保存
        </button>
      </div>
    </div>
  );
};
