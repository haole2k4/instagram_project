import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import * as yup from "yup";
import { handleEditProfile, handleGetById } from "../../../Service/UserAPI";
import { useDispatch, useSelector } from "react-redux";
import _ from "lodash";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { userLoginData } from "../../../Redux/Reducer/UserAppDeucer";

const EditProfileModal = () => {
  const { t } = useTranslation();
  const [previewImage, setPreviewImage] = useState(null);
  const [gender, setGender] = useState(null);
  const userredux = useSelector((state) => state.login.userInfo);
  const accessToken = useSelector((state) => state.login.accessToken);

  const { id } = useParams();
  let navigate = useNavigate();
  const dispatch = useDispatch();

  const userSchema = yup.object().shape({
    username: yup
      .string()
      .min(2, t("fromCreate.usernameMin"))
      .max(20, t("fromCreate.usernameMax"))
      .required(t("fromCreate.usernameRequired")),
    phone: yup
      .string()
      .matches(/^\d+$/, t("fromCreate.phoneInvalid"))
      .min(10, t("fromCreate.phoneMin"))
      .required(t("fromCreate.phoneRequired")),
    bio: yup.string().max(200, t("fromCreate.bioMax")),
    avatar: yup.mixed(),
    gender: yup.object().shape({
      value: yup.string().required(),
      label: yup.string().required(),
    }),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(userSchema),
  });

  useEffect(() => {
    fechDataUserById();
  }, [id]);

  const fechDataUserById = async () => {
    let res = await handleGetById(id);
    if (res.statusCode === 200 && res.data) {
      const user = res.data;

      setValue("username", user.userNickname);
      setValue("phone", user.userPhone);
      setValue("bio", user.userBio);
      setValue("avatar", user.userImage);

      if (user.userImage) {
        setPreviewImage(user.userImage);
      }

      const genderValue =
        user.userGender === "male"
          ? { value: "male", label: t("manageUser.male") }
          : { value: "female", label: t("manageUser.female") };
      setGender(genderValue);
      setValue("gender", genderValue);
    }
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const genderOptions = [
    { value: "male", label: t("manageUser.male") },
    { value: "female", label: t("manageUser.female") },
  ];

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
      const base64String = await convertImageToBase64(file);
      setValue("avatar", base64String);
    }
  };

  const handleGenderChange = (selectedOption) => {
    setGender(selectedOption);
    setValue("gender", selectedOption);
  };

  const onSubmit = async (data) => {
    let cloneData = _.clone(data);

    let ObjectData = {
      id: userredux.id,
      userNickname: cloneData.username,
      userPhone: cloneData.phone,
      userImage: cloneData.avatar,
      userBio: cloneData.bio,
      userGender: cloneData.gender.value,
    };

    let res = await handleEditProfile(ObjectData);
    if (res.statusCode === 200 && res.data) {
      toast.success(t("userProfile.editProfileSuccess"));
      setTimeout(() => {
        navigate("/user/profile");
      }, 1000);
      dispatch(
        userLoginData({
          user: {
            ...userredux,
            nikName: cloneData.username,
            avatar: cloneData.avatar,
          },
          accessToken: accessToken,
        })
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[600px] px-4 py-8">
      <div className="rounded-xl border border-ig-border bg-ig-surface p-6 text-ig-text">
        <div className="mb-5 flex items-center justify-between border-b border-ig-rule pb-3">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]">
            {t("fromCreate.title")}
          </h1>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] text-ig-muted">
                {t("fromCreate.name")}
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-ig-border bg-ig-ground px-3 py-2 text-[14px] text-ig-text outline-none focus:border-ig-muted"
                {...register("username")}
              />
              {errors.username && (
                <span className="mt-1 block text-[12px] text-ig-like">
                  {errors.username.message}
                </span>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] text-ig-muted">
                {t("fromCreate.phone")}
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-ig-border bg-ig-ground px-3 py-2 text-[14px] text-ig-text outline-none focus:border-ig-muted"
                {...register("phone")}
              />
              {errors.phone && (
                <span className="mt-1 block text-[12px] text-ig-like">
                  {errors.phone.message}
                </span>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] text-ig-muted">
                {t("fromCreate.gender")}
              </label>
              <Select
                options={genderOptions}
                value={gender}
                onChange={handleGenderChange}
                className="w-full"
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 999 }),
                  control: (base) => ({
                    ...base,
                    backgroundColor: "#000000",
                    borderColor: "#1a1a1a",
                    color: "#ffffff",
                    boxShadow: "none",
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: "#ffffff",
                  }),
                  input: (base) => ({
                    ...base,
                    color: "#ffffff",
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "#111111",
                    border: "1px solid #1a1a1a",
                    color: "#ffffff",
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? "#2a2a2a" : "#111111",
                    color: "#ffffff",
                  }),
                }}
              />
              {errors.gender && (
                <span className="mt-1 block text-[12px] text-ig-like">
                  {t("fromCreate.genderRequired")}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] text-ig-muted">
              {t("fromCreate.avata")}
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="ig-press rounded-lg border border-ig-border bg-ig-ground px-4 py-2 text-[13px] font-semibold text-ig-text hover:bg-ig-raised"
                onClick={() => document.getElementById("fileInput").click()}
              >
                {t("manageUser.chooseAvatar")}
              </button>
              <input
                id="fileInput"
                type="file"
                className="hidden"
                accept="image/*"
                {...register("avatar")}
                onChange={handleImageChange}
              />
              {previewImage && (
                <img
                  src={previewImage}
                  alt=""
                  className="h-14 w-14 rounded-full border border-ig-border object-cover"
                />
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] text-ig-muted">
              {t("fromCreate.bio")}
            </label>
            <textarea
              className="w-full rounded-lg border border-ig-border bg-ig-ground px-3 py-2 text-[14px] text-ig-text outline-none focus:border-ig-muted"
              {...register("bio")}
              rows="3"
            />
            {errors.bio && (
              <span className="mt-1 block text-[12px] text-ig-like">
                {errors.bio.message}
              </span>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/user/profile")}
              className="rounded-lg border border-ig-border bg-ig-ground px-4 py-2 text-[14px] font-medium text-ig-muted hover:text-ig-text"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="ig-press rounded-lg bg-ig-accent px-5 py-2 text-[14px] font-semibold text-white hover:opacity-90"
            >
              {t("fromCreate.update")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
