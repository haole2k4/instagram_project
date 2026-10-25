import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const EditProfile = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/user/settings?tab=edit_profile", { replace: true });
  }, [navigate]);

  return null;
};

export default EditProfile;
